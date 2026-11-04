/**
 * AULA ABIERTA — Mi Blog Docente
 * db.js — Módulo desacoplado de abstracción y persistencia (IndexedDB)
 * 
 * Diseñado con interfaz agnóstica para permitir sustituir fácilmente 
 * el almacenamiento local del navegador por llamadas a una API REST / Supabase.
 */

const DB_NAME = 'AulaAbiertaDB';
const DB_VERSION = 1;

class StorageService {
  constructor() {
    this.db = null;
    this._initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Almacén: Artículos (publicaciones)
        if (!db.objectStoreNames.contains('articles')) {
          const articleStore = db.createObjectStore('articles', { keyPath: 'id' });
          articleStore.createIndex('status', 'status', { unique: false });
          articleStore.createIndex('subject', 'subject', { unique: false });
          articleStore.createIndex('grade', 'grade', { unique: false });
          articleStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Almacén: Comentarios
        if (!db.objectStoreNames.contains('comments')) {
          const commentStore = db.createObjectStore('comments', { keyPath: 'id' });
          commentStore.createIndex('articleId', 'articleId', { unique: false });
          commentStore.createIndex('status', 'status', { unique: false }); // pending, approved, rejected, spam
          commentStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Almacén: Biblioteca Multimedia
        if (!db.objectStoreNames.contains('media')) {
          const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
          mediaStore.createIndex('category', 'category', { unique: false });
          mediaStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Almacén: Configuración y Sesión Demo
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        await this._seedInitialData();
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('Error al inicializar IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // ── Métodos internos sin await _initPromise (evitan deadlock en seed) ──
  _countRaw(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  _putRaw(storeName, item) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async _seedInitialData() {
    const articlesCount = await this._countRaw('articles');
    if (articlesCount === 0) {
      // Sembrar datos educativos iniciales
      const defaultArticles = [
        {
          id: 'art-ciclo-agua',
          title: 'El ciclo del agua y su vital importancia para la vida',
          summary: 'Una travesía pedagógica para comprender el viaje inagotable del recurso más preciado de nuestra isla y el planeta.',
          subject: 'Ciencias Naturales',
          grade: '5to Primaria',
          readTime: 8,
          status: 'published', // 'published', 'draft', 'scheduled'
          coverImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
          coverAlt: 'Esquema y paisaje del ciclo hidrológico en la naturaleza',
          author: 'Lic. Ramona Almonte',
          role: 'Especialista en Didáctica',
          views: 2450,
          createdAt: new Date('2025-03-14T08:30:00Z').getTime(),
          content: `
            <div style="background:linear-gradient(135deg,#e0f2fe,#f0fdf4);padding:20px 24px;border-radius:12px;margin-bottom:24px;border-left:4px solid #0284c7;">
              <p style="margin:0 0 8px;font-weight:700;color:#0369a1;">📋 Ficha Curricular — Alineada al Currículo MINERD</p>
              <p style="margin:4px 0;"><strong>Competencia fundamental:</strong> Científica y Tecnológica</p>
              <p style="margin:4px 0;"><strong>Eje temático:</strong> La Tierra y el Universo — Ciclos naturales</p>
              <p style="margin:4px 0;"><strong>Indicador de logro:</strong> Describe las fases del ciclo del agua y explica su importancia para los ecosistemas locales.</p>
              <p style="margin:4px 0;"><strong>Grado:</strong> 5to Primaria &nbsp;|&nbsp; <strong>Duración:</strong> 3 sesiones de 45 min</p>
            </div>

            <h2>1. ¿De dónde viene la lluvia que riega nuestros campos?</h2>
            <p>Cada vez que observamos un aguacero vespertino sobre Santo Domingo, el verde valle del Cibao o las aguas cristalinas del río Yaque del Norte, estamos presenciando una obra maestra de la naturaleza que lleva miles de millones de años en marcha: <strong>el ciclo del agua</strong>.</p>
            <p>Para los estudiantes de primaria en nuestra región insular, comprender este ciclo no es solo una lección de ciencias; es entender la columna vertebral de nuestra agricultura, nuestro clima templado por los alisios y el agua potable que llega a nuestros hogares y aulas escolares.</p>

            <blockquote style="border-left:4px solid #0284c7;padding:16px 20px;background:#f0f9ff;border-radius:0 8px 8px 0;margin:24px 0;">
              <p style="font-style:italic;margin:0 0 8px;">«El agua que bebió un dinosaurio hace millones de años es exactamente la misma molécula que hoy acaricia las hojas de nuestros manglares dominicanos.»</p>
              <cite style="color:#64748b;">— Principio de Conservación Hidrológica</cite>
            </blockquote>

            <h2>2. Las 4 fases clave del ciclo continuo</h2>
            <p>El agua se transforma de líquido a gas y de gas a sólido en una danza ininterrumpida:</p>
            <ol>
              <li><strong>Evaporación:</strong> El calor del sol calienta el agua superficial de los ríos, lagos y el inmenso mar Caribe, transformándola en vapor invisible que asciende a la atmósfera. En República Dominicana, con más de 1,600 km de costa, la evaporación es intensa todo el año.</li>
              <li><strong>Condensación:</strong> Al enfriarse en las capas altas, el vapor de agua se agrupa en diminutas gotas formando las nubes y la neblina matutina que cubre nuestras cordilleras Central y Septentrional.</li>
              <li><strong>Precipitación:</strong> Cuando las nubes se saturan, las gotas caen por gravedad en forma de lluvia, llovizna o, en el Pico Duarte, ocasionalmente granizo. Nuestro país recibe un promedio de 1,500 mm de lluvia al año.</li>
              <li><strong>Recolección (Escorrentía e Infiltración):</strong> El agua alimenta los acuíferos subterráneos, fluye por las cuencas de los 20 ríos principales y desemboca de vuelta en el océano, reiniciando el ciclo.</li>
            </ol>

            <div style="background:#ecfdf5;padding:16px 20px;border-radius:10px;margin:24px 0;border:1px solid #a7f3d0;">
              <h4 style="margin:0 0 8px;color:#065f46;">🌿 ¿Sabías que...?</h4>
              <p style="margin:0;">La Cordillera Central de la República Dominicana es conocida como la <em>«Madre de las Aguas»</em>. Allí nacen los ríos Yaque del Norte, Yaque del Sur, Artibonito y Yuna, que abastecen a más del 70% de la población dominicana.</p>
            </div>

            <h2>3. Secuencia Didáctica: El Experimento de la Bolsa Viajera</h2>
            <p>Esta actividad permite a los estudiantes <strong>observar las 4 fases del ciclo en tiempo real</strong> usando materiales de bajo costo disponibles en cualquier escuela dominicana.</p>

            <div style="background:#fff;padding:20px;border-radius:10px;border:1px solid #e2e8f0;margin:16px 0;">
              <h4 style="color:#1e40af;margin-top:0;">🧪 Materiales (por equipo de 4 estudiantes)</h4>
              <ul>
                <li>1 bolsa plástica tipo ziploc transparente</li>
                <li>1 taza de agua</li>
                <li>Colorante azul alimentario (2 gotas)</li>
                <li>Cinta adhesiva fuerte</li>
                <li>1 marcador permanente</li>
              </ul>

              <h4 style="color:#1e40af;">📝 Procedimiento (Sesión 1 — 45 min)</h4>
              <ol>
                <li>Verter el agua con colorante en la bolsa y sellarla herméticamente.</li>
                <li>Con el marcador, dibujar un sol arriba, nubes en el medio y el mar abajo.</li>
                <li>Pegar la bolsa en una ventana que reciba sol directo (orientación sur ideal).</li>
                <li>Registrar en el cuaderno: hora, temperatura del aula, estado de la bolsa.</li>
                <li><strong>Predicción:</strong> Cada equipo escribe qué cree que pasará en 2 horas.</li>
              </ol>

              <h4 style="color:#1e40af;">🔍 Observación (Sesión 2 — día siguiente, 45 min)</h4>
              <ol>
                <li>Observar las gotas formadas en la parte superior de la bolsa (condensación).</li>
                <li>Dibujar en el cuaderno lo que ven y etiquetar cada fase.</li>
                <li>Comparar con la predicción: ¿acertaron? ¿Qué los sorprendió?</li>
                <li>Discusión guiada: ¿Qué pasaría si tapamos el sol? ¿Y si la bolsa estuviera abierta?</li>
              </ol>
            </div>

            <h2>4. Actividad para la Familia</h2>
            <div style="background:#fef3c7;padding:16px 20px;border-radius:10px;margin:16px 0;border:1px solid #fcd34d;">
              <p style="margin:0 0 12px;font-weight:700;color:#92400e;">🏠 Misión en Casa (con un adulto acompañante)</p>
              <ol style="margin:0;">
                <li>Recorrer la casa identificando dónde se <em>usa</em> agua y dónde se <em>desperdicia</em>.</li>
                <li>Llenar una tabla con 3 columnas: lugar, uso, cantidad estimada.</li>
                <li>Proponer 3 acciones concretas para ahorrar agua en su hogar.</li>
                <li>Opcional: Tomar una foto del grifo que más gotea y traerla al aula.</li>
              </ol>
            </div>

            <h2>5. Síntesis y Compromiso Ciudadano</h2>
            <p>El ciclo hidrológico no es estático; se ve directamente impactado por la deforestación de nuestras lomas, la contaminación por plásticos en cañadas y ríos, y el calentamiento global. Cada árbol que sembramos en nuestras escuelas es un regulador del ciclo; cada botella plástica que recogemos de un arroyo es una barrera menos para el flujo natural del agua.</p>

            <div style="background:linear-gradient(135deg,#ede9fe,#e0f2fe);padding:20px;border-radius:10px;margin:24px 0;">
              <h4 style="margin:0 0 12px;color:#5b21b6;">📊 Rúbrica de Evaluación Formativa</h4>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead>
                  <tr style="background:#8b5cf6;color:#fff;">
                    <th style="padding:8px;text-align:left;border-radius:6px 0 0 0;">Criterio</th>
                    <th style="padding:8px;text-align:center;">Avanzado (4)</th>
                    <th style="padding:8px;text-align:center;">Satisfactorio (3)</th>
                    <th style="padding:8px;text-align:center;border-radius:0 6px 0 0;">En proceso (2)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="background:#f5f3ff;">
                    <td style="padding:8px;font-weight:600;">Identifica las 4 fases</td>
                    <td style="padding:8px;text-align:center;">Nombra y explica las 4 con ejemplos locales</td>
                    <td style="padding:8px;text-align:center;">Nombra las 4 fases correctamente</td>
                    <td style="padding:8px;text-align:center;">Identifica 2-3 fases</td>
                  </tr>
                  <tr>
                    <td style="padding:8px;font-weight:600;">Experimento</td>
                    <td style="padding:8px;text-align:center;">Registra y explica relación causa-efecto</td>
                    <td style="padding:8px;text-align:center;">Realiza el experimento y registra</td>
                    <td style="padding:8px;text-align:center;">Realiza el experimento con ayuda</td>
                  </tr>
                  <tr style="background:#f5f3ff;">
                    <td style="padding:8px;font-weight:600;">Compromiso ambiental</td>
                    <td style="padding:8px;text-align:center;">Propone y ejecuta acciones en su entorno</td>
                    <td style="padding:8px;text-align:center;">Propone acciones concretas</td>
                    <td style="padding:8px;text-align:center;">Reconoce la importancia del cuidado</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background:#f0f9ff;padding:16px 20px;border-radius:10px;margin:16px 0;border:1px solid #bae6fd;">
              <p style="margin:0;font-weight:600;color:#0369a1;">📖 Referencias Curriculares</p>
              <ul style="margin:8px 0 0;color:#334155;">
                <li>Diseño Curricular Nivel Primario, MINERD (2014), Área Ciencias de la Naturaleza.</li>
                <li>Ordenanza 02-2015, sobre el currículo revisado del Nivel Primario.</li>
                <li>UNESCO (2023). Educación para el Desarrollo Sostenible — ODS 6: Agua limpia.</li>
              </ul>
            </div>
          `,
          tags: ['Biodiversidad', 'MINERD', 'EducaciónAmbiental', 'Agua']
        },
        {
          id: 'art-fracciones-equiv',
          title: 'Comprendiendo las fracciones equivalentes: método visual para el aula y el hogar',
          summary: 'Estrategias gráficas paso a paso para desmitificar las fracciones y construir intuición matemática sólida.',
          subject: 'Matemáticas',
          grade: '6to Primaria',
          readTime: 7,
          status: 'published',
          coverImage: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=1200&q=80',
          coverAlt: 'Regletas y círculos fraccionarios manipulativos',
          author: 'Lic. Marcos Peña',
          role: 'Docente de Matemáticas',
          views: 1890,
          createdAt: new Date('2025-03-11T10:15:00Z').getTime(),
          content: `
            <h2>¿Por qué 1/2 es igual a 2/4 y a 4/8?</h2>
            <p>El concepto de equivalencia en fracciones suele ser una de las principales barreras pedagógicas cuando se aborda de forma puramente abstracta. Utilizando el método Singapur (Concreto-Pictórico-Abstracto), los niños pueden ver y tocar las divisiones antes de operar con números.</p>
            <p>Presentar un pastel circular dividido en 2 mitades frente a otro dividido en 4 cuartos permite comprender de inmediato que la cantidad de superficie ocupada es idéntica.</p>
          `,
          tags: ['Matemáticas', 'MétodoCPA', 'GeometríaLúdica']
        },
        {
          id: 'art-oraciones-claras',
          title: 'Cómo construir oraciones claras y coherentes en la escuela primaria',
          summary: 'Guía de sintaxis lúdica para niños: identificación del sujeto y predicado mediante fichas manipulables.',
          subject: 'Lengua Española',
          grade: '4to Primaria',
          readTime: 4,
          status: 'published',
          coverImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80',
          coverAlt: 'Cuaderno escolar con ejercicios caligráficos y gramaticales',
          author: 'Mtra. Altagracia Díaz',
          role: 'Docente de Letras',
          views: 940,
          createdAt: new Date('2025-03-08T12:00:00Z').getTime(),
          content: `
            <h2>El juego de los bloques sintácticos</h2>
            <p>Aprender la concordancia entre género y número es mucho más sencillo cuando los alumnos construyen oraciones como si fuesen trenes con vagones: ¿Quién realiza la acción? ¿Qué acción realiza? ¿Dónde o cómo ocurre?</p>
          `,
          tags: ['LenguaEspañola', 'RedacciónInicial', 'Gramática']
        },
        {
          id: 'art-manglares-borrador',
          title: 'Ecosistemas Costeros y Manglares de Samaná',
          summary: 'Una secuencia reflexiva y multidisciplinar diseñada para conectar a los alumnos de primaria con el patrimonio marino.',
          subject: 'Ciencias Naturales',
          grade: '5to Primaria',
          readTime: 6,
          status: 'draft',
          coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
          coverAlt: 'Paisaje de manglar rojo costero',
          author: 'Lic. Ramona Almonte',
          role: 'Especialista en Didáctica',
          views: 0,
          createdAt: new Date('2025-03-15T09:00:00Z').getTime(),
          content: `
            <h2>Guardianes del litoral dominicano</h2>
            <p>Borrador en construcción. Pendiente de anexar la rúbrica formativa y las preguntas de observación de campo.</p>
          `,
          tags: ['Biodiversidad', 'Samaná', 'EducaciónAmbiental']
        }
      ];

      for (const art of defaultArticles) {
        await this._putRaw('articles', art);
      }

      // Sembrar comentarios
      const defaultComments = [
        {
          id: 'comm-1',
          articleId: 'art-ciclo-agua',
          authorName: 'Prof. Manuel Grullón',
          authorType: 'teacher', // teacher, family, student, guest
          authorBadge: 'Docente Verificado',
          schoolInfo: 'Escuela Rep. de Chile • Distrito 10-01',
          content: 'Excelente desglose. Realizamos hoy mismo el experimento de la bolsa con mis 28 alumnos de 5to grado y la emoción fue fantástica. ¿Tiene recomendaciones para adaptarlo con menos luz solar?',
          status: 'pending', // pending, approved, rejected, spam
          createdAt: new Date(Date.now() - 45 * 60 * 1000).getTime(),
          teacherReply: null
        },
        {
          id: 'comm-2',
          articleId: 'art-ciclo-agua',
          authorName: 'Estefanía Peña',
          authorType: 'family',
          authorBadge: 'Familia Comunidad',
          schoolInfo: 'Madre de estudiante de 5to A',
          content: 'Leí este recurso junto a mi hijo para su proyecto escolar de ciencias. Las preguntas finales nos sirvieron para debatir el consumo de agua en casa.',
          status: 'approved',
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).getTime(),
          teacherReply: '¡Qué alegría inmensa, querida Estefanía! Ese asombro espontáneo en los ojos de los chicos es el corazón de la ciencia activa. ¡Un abrazo cálido a su grupo!'
        },
        {
          id: 'comm-3',
          articleId: 'art-fracciones-equiv',
          authorName: 'Visitante_982',
          authorType: 'guest',
          authorBadge: 'Anónimo',
          schoolInfo: 'IP: 179.53.*.* • Sin credenciales',
          content: 'Para resolver rápido sus tareas miren este link gratis en hxxp://descarga-examenes-rd.cc y ganen puntos sin estudiar.',
          status: 'pending', // flagged
          isSpamAlert: true,
          createdAt: new Date(Date.now() - 2 * 3600 * 1000).getTime(),
          teacherReply: null
        }
      ];

      for (const comm of defaultComments) {
        await this._putRaw('comments', comm);
      }

      // Sembrar biblioteca multimedia inicial
      const defaultMedia = [
        {
          id: 'media-esquema-ciclo',
          title: 'Esquema ciclo del agua RD',
          category: 'infografias',
          url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
          sizeKB: 420,
          dimensions: '1200x800',
          altText: 'Diagrama del ciclo del agua en la Cordillera Central y costas dominicanas',
          associatedArticle: 'El ciclo del agua y su importancia para la vida',
          createdAt: new Date('2024-10-14').getTime()
        },
        {
          id: 'media-manglares',
          title: 'Manglares costa norte Samaná',
          category: 'portadas',
          url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
          sizeKB: 310,
          dimensions: '1200x800',
          altText: 'Vista de manglares y estuario tropical',
          associatedArticle: 'Ecosistemas Costeros y Manglares de Samaná',
          createdAt: new Date('2024-10-20').getTime()
        },
        {
          id: 'media-fracciones',
          title: 'Material didáctico fracciones',
          category: 'fichas',
          url: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=1200&q=80',
          sizeKB: 280,
          dimensions: '1080x720',
          altText: 'Caja con regletas de madera fraccionarias',
          associatedArticle: 'Comprendiendo las fracciones equivalentes',
          createdAt: new Date('2024-11-02').getTime()
        }
      ];

      for (const med of defaultMedia) {
        await this._putRaw('media', med);
      }

      // Sembrar perfil docente por defecto (editable desde perfil.html)
      const settingsCount = await this._countRaw('settings');
      if (settingsCount === 0) {
        await this._putRaw('settings', {
          key: 'teacherProfile',
          name: 'Lic. Ramona Almonte',
          title: 'Lic.',
          role: 'Especialista en Didáctica',
          specialty: 'Educación Primaria • Mención Ciencias',
          school: 'Distrito Educativo 10-01',
          yearsExperience: 14,
          bio: 'Educar con ternura y firmeza es encender una antorcha que nunca dejará de alumbrar el porvenir de nuestra patria.',
          photoUrl: '',
          updatedAt: Date.now()
        });
      }
    }
  }

  // ── Método faltante: actualizar artículo (usado por lectura.html para vistas) ──
  async updateArticle(id, updates) {
    const article = await this.get('articles', id);
    if (!article) return null;
    Object.assign(article, updates, { updatedAt: Date.now() });
    await this.put('articles', article);
    return article;
  }

  // Operaciones CRUD genéricas sobre IndexedDB
  async get(storeName, key) {
    await this._initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAll(storeName) {
    await this._initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async put(storeName, item) {
    await this._initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(storeName, key) {
    await this._initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async count(storeName) {
    await this._initPromise;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Métodos específicos de Dominio Educativo (Facade)
  async getPublishedArticles() {
    const articles = await this.getAll('articles');
    return articles.filter(a => a.status === 'published').sort((a, b) => b.createdAt - a.createdAt);
  }

  async getArticleById(id) {
    return await this.get('articles', id);
  }

  async saveArticle(articleData) {
    if (!articleData.id) {
      articleData.id = 'art-' + Date.now();
      articleData.createdAt = Date.now();
      articleData.views = 0;
    }
    articleData.updatedAt = Date.now();
    await this.put('articles', articleData);
    return articleData;
  }

  async deleteArticle(id) {
    // Soft-delete: mover a papelera (status = 'trash') en vez de borrar permanentemente
    const article = await this.get('articles', id);
    if (!article) return false;
    article.previousStatus = article.status;
    article.status = 'trash';
    article.trashedAt = Date.now();
    await this.put('articles', article);
    return true;
  }

  async restoreArticle(id) {
    const article = await this.get('articles', id);
    if (!article || article.status !== 'trash') return null;
    article.status = article.previousStatus || 'draft';
    delete article.trashedAt;
    delete article.previousStatus;
    await this.put('articles', article);
    return article;
  }

  async permanentDeleteArticle(id) {
    // Eliminación permanente real (solo para vaciar papelera)
    const comments = await this.getAll('comments');
    for (const c of comments) {
      if (c.articleId === id) {
        await this.delete('comments', c.id);
      }
    }
    return await this.delete('articles', id);
  }

  async getTrashedArticles() {
    const articles = await this.getAll('articles');
    return articles.filter(a => a.status === 'trash').sort((a, b) => b.trashedAt - a.trashedAt);
  }

  async getCommentsByArticle(articleId, onlyApproved = true) {
    const all = await this.getAll('comments');
    return all.filter(c => c.articleId === articleId && (!onlyApproved || c.status === 'approved'))
              .sort((a, b) => b.createdAt - a.createdAt);
  }

  async addComment(commentData) {
    if (!commentData.id) {
      commentData.id = 'comm-' + Date.now();
      commentData.createdAt = Date.now();
      commentData.status = 'pending'; // moderación requerida por defecto
    }
    await this.put('comments', commentData);
    return commentData;
  }

  async updateCommentStatus(id, newStatus, replyText = null) {
    const comm = await this.get('comments', id);
    if (!comm) return null;
    comm.status = newStatus;
    if (replyText !== null) {
      comm.teacherReply = replyText;
    }
    await this.put('comments', comm);
    return comm;
  }

  async deleteComment(id) {
    return await this.delete('comments', id);
  }

  async getAllMedia() {
    const items = await this.getAll('media');
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  async saveMedia(mediaData) {
    if (!mediaData.id) {
      mediaData.id = 'media-' + Date.now();
      mediaData.createdAt = Date.now();
    }
    await this.put('media', mediaData);
    return mediaData;
  }

  async deleteMedia(id) {
    return await this.delete('media', id);
  }

  // ── Perfil Docente ──
  async getTeacherProfile() {
    const profile = await this.get('settings', 'teacherProfile');
    // Retornar defaults si no existe
    return profile || {
      key: 'teacherProfile',
      name: 'Docente',
      title: '',
      role: '',
      specialty: '',
      school: '',
      yearsExperience: 0,
      bio: '',
      photoUrl: '',
      updatedAt: Date.now()
    };
  }

  async updateTeacherProfile(updates) {
    const current = await this.getTeacherProfile();
    Object.assign(current, updates, { key: 'teacherProfile', updatedAt: Date.now() });
    await this.put('settings', current);
    return current;
  }
}

// Instancia global exportable
window.AulaAbiertaDB = new StorageService();

// === XSS Sanitization Utilities ===

// Sanitize rich HTML content — strips scripts, iframes, event handlers, dangerous tags
// Use for article body content that legitimately contains formatting (h2, p, strong, etc.)
function sanitizeHTML(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  // Remove dangerous tags
  div.querySelectorAll('script, iframe, object, embed, form, input').forEach(el => el.remove());
  // Remove event handlers and javascript: URLs
  div.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on') || attr.value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return div.innerHTML;
}
window.sanitizeHTML = sanitizeHTML;

// Escape plain text for safe insertion into HTML templates
// Use for author names, titles, summaries, comments — any user string in a template literal
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHTML = escapeHTML;

// === Non-blocking Toast Notification ===
window.showToast = function(message, type) {
  if (typeof type === 'string' && !['success','error','warning','info'].includes(type)) type = 'info';
  const toast = document.createElement('div');
  toast.className = 'toast-notification toast-' + (type || 'info');
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 24px;border-radius:8px;color:#fff;font-size:14px;z-index:9999;animation:fadeIn .3s ease;max-width:400px;box-shadow:0 4px 12px rgba(0,0,0,.15);';
  toast.style.backgroundColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 3000);
};
