/**
 * EL REDES — Mi Blog Docente
 * db.js — Capa de datos del navegador. Habla con la API del servidor (/api),
 * que guarda todo en PostgreSQL. La interfaz pública (AulaAbiertaDB) no cambió,
 * por eso las páginas siguen funcionando igual.
 */

const ADMIN_PAGES = ['panel', 'gestion', 'editor', 'biblioteca', 'moderacion', 'perfil'];
const TOKEN_KEY = 'elredes_token';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
}
function setToken(t) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {}
}

// Las páginas de administración exigen sesión iniciada
(function guardAdminPages() {
  const page = (location.pathname.split('/').pop() || '').replace('.html', '');
  if (ADMIN_PAGES.includes(page) && !getToken()) {
    location.replace('admin-login.html');
  }
})();

class StorageService {
  constructor() {
    this._initPromise = Promise.resolve();
  }

  async _api(method, url, body) {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    if (res.status === 401 && token) {
      // sesión vencida: volver a pedir la contraseña
      setToken('');
      location.replace('admin-login.html');
      throw new Error('Sesión vencida');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || ('Error ' + res.status));
    }
    return res.json();
  }

  // ── Sesión del docente ──
  async login(password) {
    const r = await this._api('POST', '/api/login', { password });
    setToken(r.token);
    return true;
  }
  logout() { setToken(''); }
  isLoggedIn() { return !!getToken(); }

  // ── ElRedes API genérica ──
  async get(storeName, key) { return this._api('GET', `/api/${storeName}/${encodeURIComponent(key)}`); }
  async getAll(storeName) { return this._api('GET', `/api/${storeName}`); }
  async put(storeName, item) {
    const key = storeName === 'settings' ? item.key : item.id;
    await this._api('PUT', `/api/${storeName}/${encodeURIComponent(key)}`, item);
    return key;
  }
  async delete(storeName, key) { await this._api('DELETE', `/api/${storeName}/${encodeURIComponent(key)}`); return true; }
  async count(storeName) { return (await this.getAll(storeName)).length; }

  // Actualizar artículo (solo docente)
  async updateArticle(id, updates) {
    const article = await this.get('articles', id);
    if (!article) return null;
    Object.assign(article, updates, { updatedAt: Date.now() });
    await this.put('articles', article);
    return article;
  }

  // Contar una vista (público)
  async registerView(id) {
    try { await this._api('POST', `/api/articles/${encodeURIComponent(id)}/view`); } catch (e) {}
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
    // Público: el servidor lo guarda siempre como "pendiente de moderación"
    return this._api('POST', '/api/comments', commentData);
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
