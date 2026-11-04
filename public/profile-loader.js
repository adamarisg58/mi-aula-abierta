/**
 * profile-loader.js — Carga dinámica del perfil docente desde IndexedDB.
 * Incluir DESPUÉS de db.js en cada página.
 *
 * Uso: await window.applyTeacherProfile()
 *   — o se ejecuta automáticamente al cargar si el body tiene data-auto-profile
 *
 * Los elementos usan atributos data-tp="campo" para ser actualizados:
 *   data-tp="name"         → nombre completo
 *   data-tp="title"        → título académico (Lic., Dr., etc.)
 *   data-tp="role"         → rol / cargo
 *   data-tp="specialty"    → área de especialidad
 *   data-tp="school"       → escuela / distrito
 *   data-tp="years"        → años de experiencia
 *   data-tp="bio"          → frase pedagógica
 *   data-tp="photo"        → src de la foto (en <img>)
 *   data-tp="photo-alt"    → alt text con el nombre
 *   data-tp="greeting"     → saludo: "¡Buen día, [Título] [Nombre]!"
 *   data-tp="titleName"    → "Título Nombre" combinado
 *   data-tp="schoolYears"  → "Escuela • N años de experiencia"
 */
(function() {
  'use strict';

  // Avatar genérico por defecto — el docente lo reemplaza desde perfil.html
  const DEFAULT_PHOTO = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%236750A4" rx="60"/><text x="60" y="72" text-anchor="middle" font-size="48" font-family="sans-serif" fill="white">👩‍🏫</text></svg>');

  let cachedProfile = null;

  async function getProfile() {
    if (cachedProfile) return cachedProfile;
    const db = window.AulaAbiertaDB;
    if (!db) return null;
    try {
      cachedProfile = await db.getTeacherProfile();
      return cachedProfile;
    } catch (e) {
      console.warn('[profile-loader] Error cargando perfil:', e);
      return null;
    }
  }

  function firstName(fullName) {
    // Extract first name after title: "Lic. Ramona Almonte" → "Ramona"
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return fullName;
    // Skip title-like prefixes
    const titles = ['lic.','mtr.','mtra.','dr.','dra.','ing.','prof.','tec.'];
    let start = 0;
    if (titles.includes(parts[0].toLowerCase())) start = 1;
    return parts[start] || fullName;
  }

  async function applyTeacherProfile() {
    const p = await getProfile();
    if (!p) return null;

    const photoSrc = p.photoUrl || DEFAULT_PHOTO;
    const titleName = p.title ? `${p.title} ${p.name}` : p.name;
    const yearsText = p.yearsExperience
      ? `${p.school} • ${p.yearsExperience} años de experiencia`
      : p.school;

    document.querySelectorAll('[data-tp]').forEach(el => {
      const field = el.getAttribute('data-tp');
      switch (field) {
        case 'name':        el.textContent = p.name; break;
        case 'title':       el.textContent = p.title; break;
        case 'role':        el.textContent = p.role; break;
        case 'specialty':   el.textContent = p.specialty; break;
        case 'school':      el.textContent = p.school; break;
        case 'years':       el.textContent = p.yearsExperience; break;
        case 'bio':         el.textContent = p.bio; break;
        case 'titleName':   el.textContent = titleName; break;
        case 'schoolYears': el.textContent = yearsText; break;
        case 'photo':
          el.src = photoSrc;
          if (!el.alt || el.alt === 'Profile') el.alt = p.name;
          break;
        case 'photo-alt':
          el.alt = p.name;
          break;
        case 'greeting':
          el.textContent = `¡Buen día, ${p.title ? p.title + ' ' : ''}${firstName(p.name)}!`;
          break;
        case 'roleBadge':
          el.textContent = p.role || el.textContent;
          break;
        case 'authorLine':
          el.textContent = `Por ${titleName}`;
          break;
        case 'emptyGreeting':
          el.textContent = `¡Bandeja al día, ${p.title ? p.title + ' ' : 'Maestra '}${firstName(p.name)}!`;
          break;
        case 'districtQuota':
          el.textContent = `Cuota institucional del ${p.school}`;
          break;
        case 'photoTitle':
          el.textContent = `Retrato ${titleName}`;
          break;
      }
    });

    return p;
  }

  // Expose globally
  window.applyTeacherProfile = applyTeacherProfile;
  window.getTeacherProfile = getProfile;
  window.TEACHER_DEFAULT_PHOTO = DEFAULT_PHOTO;

  // Auto-apply when DOM ready if body has data-auto-profile
  if (document.body && document.body.hasAttribute('data-auto-profile')) {
    applyTeacherProfile();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body.hasAttribute('data-auto-profile')) {
        applyTeacherProfile();
      }
    });
  }
})();
