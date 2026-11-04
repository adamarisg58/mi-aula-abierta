# El Redes — Blog docente

Blog educativo de Redes (6to de Secundaria). Servidor Node.js + Express con base de datos PostgreSQL, desplegado en Render.

## Estructura
- `server.js` — servidor y API REST (`/api`)
- `seed.json` — datos de ejemplo que se cargan solo la primera vez, cuando la base está vacía
- `public/` — páginas HTML, `db.js` (capa de datos del navegador) y `profile-loader.js`

## Variables de entorno (Render)
| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Internal Database URL de la base Postgres de Render |
| `ADMIN_PASSWORD` | Contraseña del docente para entrar a `admin-login.html` |
| `SESSION_SECRET` | Texto largo y aleatorio para firmar las sesiones |

## Permisos
- Público: lee artículos publicados, comentarios aprobados y el perfil docente; envía comentarios (quedan pendientes) y suma vistas.
- Docente (con contraseña): crea, edita y borra artículos, modera comentarios, administra la biblioteca y el perfil.

## Render
- Build: `npm install` — Start: `npm start`
