/**
 * EL REDES — Mi Blog Docente
 * db.js — Módulo desacoplado de abstracción y persistencia (IndexedDB)
 * 
 * Diseñado con interfaz agnóstica para permitir sustituir fácilmente 
 * el almacenamiento local del navegador por llamadas a una API REST / Supabase.
 */

const DB_NAME = 'ElRedesDB';
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
      const AUTHOR = 'Lic. Adamaris Gratero';
      const ROLE = 'Docente de Redes';
      const defaultArticles = [
        {
          id: 'art-modelo-osi',
          title: 'El modelo OSI: las 7 capas que explican cómo viaja la información',
          summary: 'Una guía para entender qué ocurre desde que das clic en "enviar" hasta que el mensaje llega al otro lado de la red.',
          subject: 'Fundamentos de Redes',
          grade: '6to Secundaria',
          readTime: 8,
          status: 'published', // 'published', 'draft', 'scheduled'
          coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
          coverAlt: 'Red global de conexiones luminosas sobre el planeta',
          author: AUTHOR,
          role: ROLE,
          views: 1250,
          createdAt: new Date('2026-10-20T08:30:00Z').getTime(),
          content: `
            <div style="background:linear-gradient(135deg,#dbeafe,#f1f5f9);padding:20px 24px;border-radius:12px;margin-bottom:24px;border-left:4px solid #2563eb;">
              <p style="margin:0 0 8px;font-weight:700;color:#1d4ed8;">📋 Ficha de la clase</p>
              <p style="margin:4px 0;"><strong>Módulo:</strong> Redes de computadoras</p>
              <p style="margin:4px 0;"><strong>Objetivo:</strong> Identificar las 7 capas del modelo OSI y explicar la función de cada una.</p>
              <p style="margin:4px 0;"><strong>Grado:</strong> 6to Secundaria &nbsp;|&nbsp; <strong>Duración:</strong> 2 sesiones de 45 min</p>
            </div>

            <h2>1. ¿Por qué necesitamos un modelo de capas?</h2>
            <p>Cuando envías un mensaje por WhatsApp intervienen la aplicación, el sistema operativo, tu tarjeta de red, el cable o la señal Wi-Fi, el router de tu casa y decenas de equipos de tu proveedor de internet. Si todo eso fuera un solo bloque, nadie podría arreglarlo ni mejorarlo. El <strong>modelo OSI</strong> (Interconexión de Sistemas Abiertos), publicado por la ISO, divide el problema en <strong>7 capas</strong>: cada una hace un trabajo concreto y solo habla con la capa de arriba y la de abajo.</p>

            <blockquote style="border-left:4px solid #2563eb;padding:16px 20px;background:#eff6ff;border-radius:0 8px 8px 0;margin:24px 0;">
              <p style="font-style:italic;margin:0 0 8px;">«Dividir un problema grande en capas pequeñas es la mejor forma de entenderlo y de repararlo.»</p>
              <cite style="color:#64748b;">— Idea central del diseño de redes por capas</cite>
            </blockquote>

            <h2>2. Las 7 capas, de arriba hacia abajo</h2>
            <ol>
              <li><strong>Capa 7 — Aplicación:</strong> donde están los servicios que usa la persona: navegador web (HTTP/HTTPS), correo (SMTP), nombres de dominio (DNS).</li>
              <li><strong>Capa 6 — Presentación:</strong> traduce, comprime y cifra los datos para que ambos extremos los entiendan (por ejemplo, TLS, JPEG, UTF-8).</li>
              <li><strong>Capa 5 — Sesión:</strong> abre, mantiene y cierra el diálogo entre dos equipos.</li>
              <li><strong>Capa 4 — Transporte:</strong> divide los datos en <em>segmentos</em> y controla su entrega. TCP es confiable; UDP es más rápido pero sin garantías.</li>
              <li><strong>Capa 3 — Red:</strong> maneja las direcciones IP y decide la ruta. Aquí trabaja el <em>router</em> y la unidad de datos es el <em>paquete</em>.</li>
              <li><strong>Capa 2 — Enlace de datos:</strong> entrega <em>tramas</em> dentro de una misma red usando direcciones MAC. Aquí trabaja el <em>switch</em>.</li>
              <li><strong>Capa 1 — Física:</strong> cables, fibra, ondas de radio y señales eléctricas; transporta <em>bits</em>. Aquí trabajan los cables y los hubs.</li>
            </ol>

            <div style="background:#f3e8ff;padding:16px 20px;border-radius:10px;margin:24px 0;border:1px solid #d8b4fe;">
              <h4 style="margin:0 0 8px;color:#6b21a8;">💡 Truco para memorizarlas</h4>
              <p style="margin:0;">De la capa 7 a la 1: <strong>A</strong>plicación, <strong>P</strong>resentación, <strong>S</strong>esión, <strong>T</strong>ransporte, <strong>R</strong>ed, <strong>E</strong>nlace, <strong>F</strong>ísica. Una frase: <em>«A Papá Siempre Te Ríe En Familia»</em>.</p>
            </div>

            <h2>3. Encapsulamiento: el viaje de un mensaje</h2>
            <p>Al enviar datos, cada capa le agrega su propia información de control (una <em>cabecera</em>) a lo que recibe de la capa superior. A este proceso se le llama <strong>encapsulamiento</strong>: datos → segmento → paquete → trama → bits. En el equipo receptor ocurre lo contrario (<em>desencapsulamiento</em>) hasta que la aplicación recibe el mensaje original.</p>

            <h2>4. Actividad práctica</h2>
            <ul>
              <li>Abre el símbolo del sistema y ejecuta <code>ping 8.8.8.8</code>: ¿en qué capa trabaja este comando? (Pista: usa direcciones IP).</li>
              <li>Ejecuta <code>ipconfig /all</code> (Windows) o <code>ip a</code> (Linux) y localiza tu dirección MAC y tu dirección IP: ¿qué capa usa cada una?</li>
              <li>Con un cable desconectado, comprueba qué capa falla primero y cuál es el síntoma.</li>
            </ul>

            <h2>Para pensar</h2>
            <p>Si una página web no carga pero <code>ping</code> a una IP sí responde, ¿en qué capas es más probable que esté el problema? Justifica tu respuesta.</p>
          `,
          tags: ['ModeloOSI', 'Redes', 'Fundamentos', 'Encapsulamiento']
        },
        {
          id: 'art-direccionamiento-ip',
          title: 'Direccionamiento IPv4 y subredes: aprende a dividir una red paso a paso',
          summary: 'Qué es una dirección IP, cómo se lee una máscara y cómo se divide una red /24 en cuatro subredes.',
          subject: 'Direccionamiento IP',
          grade: '6to Secundaria',
          readTime: 9,
          status: 'published',
          coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
          coverAlt: 'Servidores y cables de red en un centro de datos',
          author: AUTHOR,
          role: ROLE,
          views: 980,
          createdAt: new Date('2026-10-27T10:15:00Z').getTime(),
          content: `
            <h2>1. ¿Qué es una dirección IPv4?</h2>
            <p>Una dirección IPv4 es un número de <strong>32 bits</strong> escrito en cuatro grupos de 8 bits (octetos) separados por puntos, por ejemplo <code>192.168.10.25</code>. Cada octeto va de 0 a 255. La dirección tiene dos partes: la <strong>parte de red</strong> (a qué red pertenece) y la <strong>parte de host</strong> (qué equipo es dentro de esa red). La <strong>máscara de subred</strong> indica dónde termina una y empieza la otra.</p>

            <h2>2. Máscara y notación CIDR</h2>
            <p>La máscara <code>255.255.255.0</code> tiene 24 bits en 1, por eso se escribe <code>/24</code>. Con 8 bits para hosts hay 2<sup>8</sup> = 256 direcciones, pero se restan 2: la <em>dirección de red</em> (primera) y la de <em>broadcast</em> (última). Quedan <strong>254 hosts utilizables</strong>.</p>
            <blockquote style="border-left:4px solid #2563eb;padding:16px 20px;background:#eff6ff;border-radius:0 8px 8px 0;margin:24px 0;">
              <p style="margin:0;">Fórmula: hosts utilizables = 2<sup>h</sup> − 2, donde <strong>h</strong> es la cantidad de bits de host.</p>
            </blockquote>

            <h2>3. Direcciones privadas</h2>
            <ul>
              <li><code>10.0.0.0/8</code> (10.0.0.0 – 10.255.255.255)</li>
              <li><code>172.16.0.0/12</code> (172.16.0.0 – 172.31.255.255)</li>
              <li><code>192.168.0.0/16</code> (192.168.0.0 – 192.168.255.255)</li>
            </ul>
            <p>Son las que usan las redes de casas, escuelas y oficinas; el router las traduce a una dirección pública mediante NAT.</p>

            <h2>4. Ejemplo resuelto: dividir 192.168.10.0/24 en 4 subredes</h2>
            <p>Necesitamos 4 subredes, así que "prestamos" 2 bits de host (2<sup>2</sup> = 4). La nueva máscara es <code>/26</code> = <code>255.255.255.192</code>. Quedan 6 bits de host: 2<sup>6</sup> − 2 = <strong>62 hosts por subred</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <thead><tr style="background:#e2e8f0;text-align:left;"><th style="padding:8px;">Subred</th><th style="padding:8px;">Dirección de red</th><th style="padding:8px;">Rango utilizable</th><th style="padding:8px;">Broadcast</th></tr></thead>
              <tbody>
                <tr><td style="padding:8px;">1</td><td style="padding:8px;">192.168.10.0/26</td><td style="padding:8px;">.1 – .62</td><td style="padding:8px;">192.168.10.63</td></tr>
                <tr><td style="padding:8px;">2</td><td style="padding:8px;">192.168.10.64/26</td><td style="padding:8px;">.65 – .126</td><td style="padding:8px;">192.168.10.127</td></tr>
                <tr><td style="padding:8px;">3</td><td style="padding:8px;">192.168.10.128/26</td><td style="padding:8px;">.129 – .190</td><td style="padding:8px;">192.168.10.191</td></tr>
                <tr><td style="padding:8px;">4</td><td style="padding:8px;">192.168.10.192/26</td><td style="padding:8px;">.193 – .254</td><td style="padding:8px;">192.168.10.255</td></tr>
              </tbody>
            </table>
            <p>El "salto" entre subredes es 256 − 192 = <strong>64</strong>, por eso las redes comienzan en 0, 64, 128 y 192.</p>

            <div style="background:#f3e8ff;padding:16px 20px;border-radius:10px;margin:24px 0;border:1px solid #d8b4fe;">
              <h4 style="margin:0 0 8px;color:#6b21a8;">🧪 Practica</h4>
              <p style="margin:0;">Divide <code>192.168.20.0/24</code> en 8 subredes. ¿Cuál es la nueva máscara, cuántos hosts tiene cada una y cuál es el rango de la tercera subred?</p>
            </div>

            <h2>5. Errores comunes</h2>
            <ul>
              <li>Asignar la dirección de red o la de broadcast a un equipo.</li>
              <li>Poner dos equipos con la misma IP (conflicto de direcciones).</li>
              <li>Configurar una puerta de enlace que no pertenece a la misma subred del equipo.</li>
            </ul>
          `,
          tags: ['IPv4', 'Subredes', 'CIDR', 'Direccionamiento']
        },
        {
          id: 'art-cableado-estructurado',
          title: 'Cableado estructurado: cómo se organiza la red física de un edificio',
          summary: 'Subsistemas, categorías de cable UTP y el orden de colores T568B para armar un cable de red correctamente.',
          subject: 'Cableado Estructurado',
          grade: '6to Secundaria',
          readTime: 7,
          status: 'published',
          coverImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80',
          coverAlt: 'Rack de comunicaciones con cables de red ordenados',
          author: AUTHOR,
          role: ROLE,
          views: 760,
          createdAt: new Date('2026-10-30T12:00:00Z').getTime(),
          content: `
            <h2>1. ¿Qué es el cableado estructurado?</h2>
            <p>Es un sistema organizado y normalizado de cables, conectores y paneles que lleva voz, datos y video por todo un edificio. Se rige por normas como <strong>TIA/EIA-568</strong>, lo que permite que equipos de distintos fabricantes funcionen juntos y que la red sea fácil de ampliar y reparar.</p>

            <h2>2. Los subsistemas</h2>
            <ol>
              <li><strong>Área de trabajo:</strong> donde están las computadoras y los tomas de pared.</li>
              <li><strong>Cableado horizontal:</strong> une cada toma con el cuarto de telecomunicaciones del mismo piso. Longitud máxima del enlace permanente: <strong>90 m</strong>.</li>
              <li><strong>Cableado vertical (backbone):</strong> conecta pisos y edificios entre sí, normalmente con fibra óptica.</li>
              <li><strong>Cuarto de telecomunicaciones:</strong> alberga rack, patch panel y switches.</li>
              <li><strong>Cuarto de equipos y acometida:</strong> servidores y entrada de los servicios del proveedor.</li>
            </ol>
            <p>Sumando los cables de parcheo (hasta 10 m en total), el canal completo no debe pasar de <strong>100 m</strong>.</p>

            <h2>3. Categorías de cable UTP</h2>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <thead><tr style="background:#e2e8f0;text-align:left;"><th style="padding:8px;">Categoría</th><th style="padding:8px;">Velocidad típica</th><th style="padding:8px;">Uso común</th></tr></thead>
              <tbody>
                <tr><td style="padding:8px;">Cat5e</td><td style="padding:8px;">1 Gbps (100 m)</td><td style="padding:8px;">Redes de oficina y escuela</td></tr>
                <tr><td style="padding:8px;">Cat6</td><td style="padding:8px;">1 Gbps (100 m) / 10 Gbps (hasta 55 m)</td><td style="padding:8px;">Redes actuales</td></tr>
                <tr><td style="padding:8px;">Cat6a</td><td style="padding:8px;">10 Gbps (100 m)</td><td style="padding:8px;">Centros de datos y backbone corto</td></tr>
              </tbody>
            </table>

            <h2>4. Orden de colores T568B</h2>
            <p>Mirando el conector RJ-45 con la lengüeta hacia abajo y los contactos hacia ti, de izquierda a derecha:</p>
            <ol>
              <li>Blanco/naranja</li><li>Naranja</li><li>Blanco/verde</li><li>Azul</li><li>Blanco/azul</li><li>Verde</li><li>Blanco/marrón</li><li>Marrón</li>
            </ol>
            <div style="background:#f3e8ff;padding:16px 20px;border-radius:10px;margin:24px 0;border:1px solid #d8b4fe;">
              <h4 style="margin:0 0 8px;color:#6b21a8;">🛠️ Práctica de taller</h4>
              <p style="margin:0;">Arma un cable <strong>directo</strong> (T568B en ambos extremos) y pruébalo con el probador de cables. Luego arma uno <strong>cruzado</strong> (T568B en un extremo y T568A en el otro) y explica en qué casos se usaba.</p>
            </div>

            <h2>5. Buenas prácticas</h2>
            <ul>
              <li>No doblar el cable con curvas muy cerradas ni jalarlo con fuerza.</li>
              <li>Separar los cables de datos de los cables de energía.</li>
              <li>Etiquetar ambos extremos de cada cable y cada puerto del patch panel.</li>
              <li>Probar y documentar cada enlace al terminar.</li>
            </ul>
          `,
          tags: ['Cableado', 'UTP', 'T568B', 'Taller']
        },
        {
          id: 'art-seguridad-wifi-borrador',
          title: 'Seguridad en redes Wi-Fi: cómo proteger la red de la escuela y de tu casa',
          summary: 'Cifrado WPA2/WPA3, contraseñas robustas y buenas prácticas para evitar accesos no autorizados.',
          subject: 'Seguridad en Redes',
          grade: '6to Secundaria',
          readTime: 6,
          status: 'draft',
          coverImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
          coverAlt: 'Candado digital sobre un circuito electrónico',
          author: AUTHOR,
          role: ROLE,
          views: 0,
          createdAt: new Date('2026-11-02T09:00:00Z').getTime(),
          content: `
            <h2>Protegiendo nuestras redes inalámbricas</h2>
            <p>Borrador en construcción. Pendiente de agregar la práctica de laboratorio y la lista de verificación de seguridad.</p>
          `,
          tags: ['Seguridad', 'WiFi', 'WPA3']
        }
      ];

      for (const art of defaultArticles) {
        await this._putRaw('articles', art);
      }

      // Sembrar comentarios
      const defaultComments = [
        {
          id: 'comm-1',
          articleId: 'art-modelo-osi',
          authorName: 'Prof. Manuel Grullón',
          authorType: 'teacher', // teacher, family, student, guest
          authorBadge: 'Docente Verificado',
          schoolInfo: 'Docente de Informática • Santo Domingo',
          content: 'Excelente explicación del encapsulamiento. Usé la frase para memorizar las capas con mis estudiantes de 6to y les encantó. ¿Tiene alguna práctica con Wireshark para ver las cabeceras?',
          status: 'pending', // pending, approved, rejected, spam
          createdAt: new Date(Date.now() - 45 * 60 * 1000).getTime(),
          teacherReply: null
        },
        {
          id: 'comm-2',
          articleId: 'art-direccionamiento-ip',
          authorName: 'Estefanía Peña',
          authorType: 'family',
          authorBadge: 'Familia Comunidad',
          schoolInfo: 'Madre de estudiante de 6to',
          content: 'Mi hijo practicó las subredes con la tabla del artículo y por fin entendió por qué el salto es de 64. ¡Muchas gracias por explicarlo tan claro!',
          status: 'approved',
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).getTime(),
          teacherReply: '¡Qué alegría, Estefanía! Dígale que practique con la subred 192.168.20.0/24 del reto final. ¡Saludos a su familia!'
        },
        {
          id: 'comm-3',
          articleId: 'art-cableado-estructurado',
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
          id: 'media-modelo-osi',
          title: 'Esquema modelo OSI',
          category: 'infografias',
          url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
          sizeKB: 420,
          dimensions: '1200x800',
          altText: 'Red global de conexiones que representa el viaje de los datos entre capas',
          associatedArticle: 'El modelo OSI: las 7 capas que explican cómo viaja la información',
          createdAt: new Date('2026-10-18').getTime()
        },
        {
          id: 'media-subredes',
          title: 'Tabla de subredes /26',
          category: 'fichas',
          url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
          sizeKB: 310,
          dimensions: '1200x800',
          altText: 'Servidores y cables en un centro de datos',
          associatedArticle: 'Direccionamiento IPv4 y subredes: aprende a dividir una red paso a paso',
          createdAt: new Date('2026-10-25').getTime()
        },
        {
          id: 'media-cableado',
          title: 'Rack y patch panel',
          category: 'portadas',
          url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80',
          sizeKB: 280,
          dimensions: '1080x720',
          altText: 'Rack de comunicaciones con cables de red ordenados',
          associatedArticle: 'Cableado estructurado: cómo se organiza la red física de un edificio',
          createdAt: new Date('2026-10-29').getTime()
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
          name: 'Adamaris Gratero',
          title: 'Lic.',
          role: 'Docente de Redes',
          specialty: 'Informática • Redes',
          school: 'Politécnico José Núñez de Cáceres',
          yearsExperience: 0,
          bio: 'Enseñar redes es enseñar a conectar: cada estudiante que entiende cómo viaja un paquete aprende también a construir puentes.',
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
