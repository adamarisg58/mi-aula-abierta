/**
 * El Redes — servidor del blog docente
 * Sirve los archivos estáticos de /public y una API REST sobre PostgreSQL.
 *
 * Variables de entorno:
 *   DATABASE_URL     cadena de conexión de Postgres (Render la entrega)
 *   ADMIN_PASSWORD   contraseña del docente para el panel de administración
 *   SESSION_SECRET   texto largo y aleatorio para firmar las sesiones
 *   PORT             puerto (Render lo define solo)
 */
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const STORES = ['articles', 'comments', 'media', 'settings'];
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 8) {
  console.error('ADMIN_PASSWORD debe tener al menos 8 caracteres');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render exige SSL en conexiones externas; la interna también lo acepta.
  ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
});

// ── Base de datos ──────────────────────────────────────────────
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS docs (
      store      TEXT        NOT NULL,
      key        TEXT        NOT NULL,
      data       JSONB       NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (store, key)
    )`);
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM docs');
  if (rows[0].n === 0) {
    const seed = require('./seed.json');
    for (const store of STORES) {
      for (const item of seed[store] || []) {
        await upsert(store, item);
      }
    }
    console.log('Datos de ejemplo cargados.');
  }
}

const keyOf = (store, item) => String(store === 'settings' ? item.key : item.id);

async function upsert(store, item) {
  const key = keyOf(store, item);
  await pool.query(
    `INSERT INTO docs (store, key, data) VALUES ($1, $2, $3)
     ON CONFLICT (store, key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [store, key, item]
  );
}

// ── Sesión del docente (token firmado) ─────────────────────────
function signToken() {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(exp).digest('hex');
  return exp + '.' + sig;
}
function validToken(token) {
  if (typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = crypto.createHmac('sha256', SESSION_SECRET).update(exp).digest('hex');
  const a = Buffer.from(sig), b = Buffer.from(good);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const isAdmin = (req) => validToken((req.get('authorization') || '').replace(/^Bearer\s+/i, ''));
const requireAdmin = (req, res, next) =>
  isAdmin(req) ? next() : res.status(401).json({ error: 'No autorizado' });

// Límite sencillo de intentos de inicio de sesión
const attempts = new Map();
function loginAllowed(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 60_000);
  attempts.set(ip, list);
  return list.length < 5;
}

// ── App ────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '8mb' }));

app.get('/healthz', (_req, res) => res.send('ok'));

app.post('/api/login', (req, res) => {
  if (!loginAllowed(req.ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' });
  attempts.get(req.ip).push(Date.now());
  const given = Buffer.from(String((req.body || {}).password || ''));
  const real = Buffer.from(ADMIN_PASSWORD);
  const ok = given.length === real.length && crypto.timingSafeEqual(given, real);
  if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });
  res.json({ token: signToken() });
});

app.get('/api/session', (req, res) => res.json({ admin: isAdmin(req) }));

// Comentarios públicos: siempre quedan pendientes de moderación
app.post('/api/comments', async (req, res, next) => {
  try {
    const b = req.body || {};
    const articleId = String(b.articleId || '');
    const content = String(b.content || '').trim().slice(0, 2000);
    if (!articleId || !content) return res.status(400).json({ error: 'Datos incompletos' });
    const art = await pool.query(`SELECT 1 FROM docs WHERE store='articles' AND key=$1 AND data->>'status'='published'`, [articleId]);
    if (!art.rowCount) return res.status(404).json({ error: 'Artículo no encontrado' });
    const types = ['family', 'student', 'guest', 'teacher'];
    const authorType = types.includes(b.authorType) ? b.authorType : 'guest';
    const comment = {
      id: 'comm-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'),
      articleId,
      authorName: String(b.authorName || 'Visitante').trim().slice(0, 80) || 'Visitante',
      authorType,
      authorBadge: '',
      schoolInfo: String(b.schoolInfo || '').slice(0, 120),
      content,
      status: 'pending',
      createdAt: Date.now(),
      teacherReply: null,
    };
    await upsert('comments', comment);
    res.status(201).json(comment);
  } catch (e) { next(e); }
});

// Contador de vistas (público)
app.post('/api/articles/:id/view', async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE docs SET data = jsonb_set(data, '{views}', to_jsonb(COALESCE((data->>'views')::int, 0) + 1))
       WHERE store='articles' AND key=$1 AND data->>'status'='published'`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

const checkStore = (req, res, next) =>
  STORES.includes(req.params.store) ? next() : res.status(404).json({ error: 'No existe' });

// Lectura: el público solo ve lo publicado / aprobado / el perfil docente
function publicFilter(store) {
  switch (store) {
    case 'articles': return `AND data->>'status' = 'published'`;
    case 'comments': return `AND data->>'status' = 'approved'`;
    case 'settings': return `AND key = 'teacherProfile'`;
    default: return `AND false`; // media: solo administración
  }
}

app.get('/api/:store', checkStore, async (req, res, next) => {
  try {
    const extra = isAdmin(req) ? '' : publicFilter(req.params.store);
    const { rows } = await pool.query(`SELECT data FROM docs WHERE store = $1 ${extra}`, [req.params.store]);
    res.json(rows.map((r) => r.data));
  } catch (e) { next(e); }
});

app.get('/api/:store/:key', checkStore, async (req, res, next) => {
  try {
    const extra = isAdmin(req) ? '' : publicFilter(req.params.store);
    const { rows } = await pool.query(`SELECT data FROM docs WHERE store = $1 AND key = $2 ${extra}`, [req.params.store, req.params.key]);
    res.json(rows[0] ? rows[0].data : null);
  } catch (e) { next(e); }
});

// Escritura: solo el docente
app.put('/api/:store/:key', requireAdmin, checkStore, async (req, res, next) => {
  try {
    const item = req.body;
    if (!item || typeof item !== 'object') return res.status(400).json({ error: 'Cuerpo inválido' });
    if (req.params.store === 'settings') item.key = req.params.key; else item.id = req.params.key;
    await upsert(req.params.store, item);
    res.json(item);
  } catch (e) { next(e); }
});

app.delete('/api/:store/:key', requireAdmin, checkStore, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM docs WHERE store = $1 AND key = $2', [req.params.store, req.params.key]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'No existe' }));

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error del servidor' });
});

initDb()
  .then(() => app.listen(PORT, () => console.log('El Redes escuchando en el puerto ' + PORT)))
  .catch((e) => { console.error('No se pudo iniciar la base de datos', e); process.exit(1); });
