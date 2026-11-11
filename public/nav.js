/**
 * El Redes — menú superior derecho.
 * Construye los botones de navegación en la esquina superior derecha de la cabecera
 * y elimina la barra inferior anterior.
 */
(function () {
  const ADMIN = ['panel', 'gestion', 'editor', 'biblioteca', 'moderacion', 'perfil'];
  const PUBLIC_ITEMS = [
    ['index.html', 'home', 'Inicio'],
    ['publicaciones.html', 'menu_book', 'Artículos'],
    ['recursos.html', 'folder_open', 'Recursos'],
    ['panel.html', 'dashboard', 'Panel'],
  ];
  const ADMIN_ITEMS = [
    ['index.html', 'home', 'Inicio'],
    ['panel.html', 'dashboard', 'Panel'],
    ['gestion.html', 'article', 'Artículos'],
    ['editor.html', 'edit_note', 'Editor'],
    ['biblioteca.html', 'photo_library', 'Medios'],
    ['moderacion.html', 'rate_review', 'Moderación'],
    ['perfil.html', 'manage_accounts', 'Perfil'],
  ];

  function build() {
    const header = document.querySelector('body > header');
    const page = (location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';
    if (!header || page === 'admin-login') return;

    // quitar la barra inferior anterior
    document.querySelectorAll('body > nav.fixed.bottom-0, nav.fixed.bottom-0').forEach((n) => n.remove());

    const items = ADMIN.includes(page) ? ADMIN_ITEMS : PUBLIC_ITEMS;
    const inner = header.firstElementChild;
    if (!inner) return;
    let right = inner.lastElementChild;
    if (!right || right === inner.firstElementChild) {
      right = document.createElement('div');
      right.className = 'flex items-center gap-1 shrink-0';
      inner.appendChild(right);
    }

    // los botones de búsqueda/guardados eran decorativos: se quitan para dar espacio
    right.querySelectorAll('button[aria-label^="Buscar"], button[aria-label^="Guardados"]').forEach((b) => b.remove());
    // duplicados del menú nuevo (Inicio y Moderación): se quitan para que todo quepa en el celular
    right.querySelectorAll('a[title="Ver blog público"], button[title^="Notificaciones"]').forEach((b) => b.remove());
    // la insignia del cargo solo se muestra en pantallas medianas o grandes
    header.querySelectorAll('[data-tp="roleBadge"]').forEach((el) => el.classList.add('hidden', 'sm:inline-block'));

    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Navegación principal');
    nav.className = 'flex items-center gap-0.5 sm:gap-1';
    nav.innerHTML = items.map(([href, icon, label]) => {
      const active = href.replace('.html', '') === page;
      const cls = active
        ? 'bg-primary-container text-on-primary'
        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary';
      return '<a href="' + href + '" title="' + label + '" aria-label="' + label + '"' + (active ? ' aria-current="page"' : '') +
        ' class="h-9 min-w-8 sm:min-w-9 px-1.5 sm:px-2 flex items-center justify-center gap-1 rounded-lg transition-colors ' + cls + '">' +
        '<span class="material-symbols-outlined text-[20px]">' + icon + '</span>' +
        '<span class="hidden lg:inline font-label-md text-label-md">' + label + '</span></a>';
    }).join('');
    right.prepend(nav);

    // en las páginas de administración, botón para cerrar sesión
    if (ADMIN.includes(page) && window.AulaAbiertaDB && window.AulaAbiertaDB.logout) {
      const out = document.createElement('button');
      out.title = 'Cerrar sesión';
      out.setAttribute('aria-label', 'Cerrar sesión');
      out.className = 'h-9 w-8 sm:w-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors';
      out.innerHTML = '<span class="material-symbols-outlined text-[20px]">logout</span>';
      out.onclick = () => { window.AulaAbiertaDB.logout(); location.href = 'admin-login.html'; };
      nav.appendChild(out);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
