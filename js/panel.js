/* ===== EBTOOLS — BACKOFFICE LOGIC ===== */
const CFG = window.EBTOOLS_CONFIG || {};
const CONFIGURED = CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes('__SUPABASE_URL__') &&
  CFG.SUPABASE_ANON_KEY && !CFG.SUPABASE_ANON_KEY.includes('__SUPABASE_ANON_KEY__');

let sb = null;
const state = { cats: [], subcats: [], products: [], psearch: '', psort: 'recent', catsearch: '', scsearch: '', sccat: '', orderCtx: 'general', ordersearch: '' };

// Devuelve "hace 3 min", "ayer", "12 abr", etc. para mostrar al lado de cada fila.
function relativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1)  return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'ayer';
  if (days < 7)   return `hace ${days} días`;
  // Más de una semana → fecha corta (ej. "12 abr" o "12 abr 2025" si es otro año).
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return sameYear
    ? `${d.getDate()} ${months[d.getMonth()]}`
    : `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fullTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
const _featChanged    = new Set(); // IDs whose featured/featured_sort changed in the Destacados picker
const _catalogChanged = new Set(); // IDs whose catalog_pinned/catalog_order changed in the Catálogo picker
const _orderChanged   = new Set(); // IDs whose orden (sort / cat_order / subcat_order) changed en el tab Orden

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

// Genera una "clave" interna a partir del nombre (el empleado nunca la ve).
const slugify = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Íconos listos para elegir al crear una categoría (el empleado solo toca uno).
const PRESET_ICONS = [
  { name: 'Caja / cajón',        svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>' },
  { name: 'Herramienta / llave', svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6a2 2 0 1 0 3 3l6-6a4 4 0 0 0 5.4-5.4l-2.7 2.7-2.3-.6-.6-2.3 2.6-2.8z"/></svg>' },
  { name: 'Engranaje',           svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
  { name: 'Aire / neumática',    svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' },
  { name: 'Pintura / gota',      svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>' },
  { name: 'Camión / envíos',     svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' },
  { name: 'Filtro / embudo',     svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>' },
  { name: 'Paquete / repuestos', svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>' },
  { name: 'Medalla / oficial',   svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>' },
  { name: 'Capas / construcción',svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>' },
  { name: 'Disco / amoladora',   svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>' },
  { name: 'Escudo / garantía',   svg: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>' },
];
// Ícono por defecto si por algún motivo no se eligió ninguno.
const DEFAULT_CAT_ICON = PRESET_ICONS[0].svg;

// Un producto puede tener varias categorías/subcategorías. Soporta el
// formato nuevo (arrays cats/subcats) y el viejo (cat/subcat único).
const pcats = p => Array.isArray(p.cats) && p.cats.length ? p.cats : (p.cat ? [p.cat] : []);
const psubs = p => Array.isArray(p.subcats) && p.subcats.length ? p.subcats : (p.subcat ? [p.subcat] : []);

// Bucket de Supabase Storage donde se suben las imágenes de productos.
const IMG_BUCKET = 'product-images';

function toast(msg, isErr = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  setTimeout(() => { t.className = 'toast'; }, 2600);
}

/* ---------- AUTH ---------- */
async function initAuth() {
  if (!CONFIGURED) {
    $('login-error').textContent = 'Supabase no está configurado todavía (js/config.js).';
    $('login-btn').disabled = true;
    return;
  }
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  const { data } = await sb.auth.getSession();
  if (data.session) showAdmin(data.session);
}

async function doLogin(e) {
  e.preventDefault();
  const errEl = $('login-error');
  errEl.textContent = '';
  $('login-btn').disabled = true;

  let user = $('login-user').value.trim();
  const pass = $('login-pass').value;
  // El usuario escribe "USUARIOEBTOOLS"; Supabase Auth usa email.
  const email = user.includes('@') ? user : CFG.ADMIN_EMAIL;

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  $('login-btn').disabled = false;
  if (error) { errEl.textContent = 'Usuario o contraseña incorrectos.'; return; }
  showAdmin(data.session);
}

async function doLogout() {
  await sb.auth.signOut();
  $('admin-view').style.display = 'none';
  $('login-view').style.display = 'flex';
  $('login-pass').value = '';
}

async function showAdmin(session) {
  $('login-view').style.display = 'none';
  $('admin-view').style.display = 'block';
  $('admin-user').textContent = CFG.ADMIN_USERNAME || session.user.email;
  await loadAll();
}

/* ---------- DATA ---------- */
async function loadAll() {
  const [c, s, p] = await Promise.all([
    sb.from('categories').select('*').order('sort'),
    sb.from('subcategories').select('*').order('sort'),
    sb.from('products').select('*').order('sort'),
  ]);
  state.cats = c.data || [];
  state.subcats = s.data || [];
  state.products = p.data || [];
  _featChanged.clear();
  _catalogChanged.clear();
  _orderChanged.clear();
  populateSubcatCatFilter();
  populateOrderContext();
  renderProducts();
  renderCats();
  renderSubcats();
  renderFeatured();
}

const catLabel = k => state.cats.find(c => c.key === k)?.label || k;
const subLabel = k => state.subcats.find(s => s.key === k)?.label || (k || '—');

/* ---------- RENDER: PRODUCTS ---------- */
function sortProductsList(list, mode) {
  const sorted = [...list];
  switch (mode) {
    case 'name':
      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
    case 'sort':
      return sorted.sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.id - b.id);
    case 'new':
      return sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    case 'recent':
    default:
      return sorted.sort((a, b) =>
        new Date(b.updated_at || b.created_at || 0) -
        new Date(a.updated_at || a.created_at || 0));
  }
}

function renderProducts() {
  const wrap = $('products-table');
  const q = state.psearch.toLowerCase();
  let list = state.products.filter(p =>
    !q ||
    p.name.toLowerCase().includes(q) ||
    pcats(p).map(catLabel).join(' ').toLowerCase().includes(q));
  list = sortProductsList(list, state.psort);

  if (!list.length) { wrap.innerHTML = '<div class="empty">Sin productos.</div>'; return; }

  // Resaltar el chip de fecha cuando el producto se editó hace menos de 7 días
  // (ayuda al admin a ver de un pantallazo qué se tocó recientemente).
  const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

  wrap.innerHTML = list.map(p => {
    const ts = p.updated_at || p.created_at;
    const isRecent = ts && (Date.now() - new Date(ts).getTime()) < RECENT_MS;
    const rel  = relativeTime(ts);
    const full = fullTimestamp(ts);
    const stamp = ts
      ? `<span class="row-stamp${isRecent ? ' recent' : ''}" title="Última edición: ${esc(full)}">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
           ${esc(rel)}
         </span>`
      : '';
    return `
    <div class="row">
      <img src="${esc(p.img)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="row-main">
        <div class="row-title">${esc(p.name)} ${stamp}</div>
        <div class="row-meta">
          ${pcats(p).map(c => `<span class="tag">${esc(catLabel(c))}</span>`).join('')}
          ${psubs(p).map(s => `<span class="tag tag-sub">${esc(subLabel(s))}</span>`).join('')}
          ${pcats(p).length === 0 ? '<span class="tag warn">&#9888; Sin categoría</span>' : ''}
          ${psubs(p).length === 0 ? '<span class="tag warn-sub">Sin subcategoría</span>' : ''}
          ${p.active ? '' : '<span class="tag off">Oculto</span>'}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" onclick="editProduct(${p.id})">Editar</button>
        <button class="icon-btn danger" onclick="delProduct(${p.id})">Borrar</button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- RENDER: CATEGORIES ---------- */
function renderCats() {
  const wrap = $('cats-table');
  const q = state.catsearch.trim().toLowerCase();
  let list = [...state.cats];
  if (q) {
    list = list.filter(c => {
      if (c.label.toLowerCase().includes(q)) return true;
      // También muestra la categoría si algún producto suyo coincide con la búsqueda
      return state.products.some(p => pcats(p).includes(c.key) && p.name.toLowerCase().includes(q));
    });
  }
  if (!list.length) { wrap.innerHTML = '<div class="empty">Sin categorías que coincidan.</div>'; return; }
  wrap.innerHTML = list.map(c => {
    const n = state.products.filter(p => pcats(p).includes(c.key)).length;
    return `
    <div class="row">
      <div class="sort-badge" title="Orden en el catálogo (editá para cambiar)">${c.sort ?? 0}</div>
      <div class="row-icon">${c.icon || ''}</div>
      <div class="row-main">
        <div class="row-title">${esc(c.label)}</div>
        <div class="row-meta">${n} producto${n === 1 ? '' : 's'}</div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" onclick="editCat('${esc(c.key)}')">Editar</button>
        <button class="icon-btn danger" onclick="delCat('${esc(c.key)}')">Borrar</button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- RENDER: FEATURED PICKER ---------- */
function renderFeatured() {
  const wrap = $('featured-table');
  if (!wrap) return;
  const q = ($('featured-search')?.value || '').toLowerCase();
  let list = [...state.products];
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || pcats(p).map(catLabel).join(' ').toLowerCase().includes(q));

  // Featured products first (sorted by featured_sort), then rest alphabetically
  list.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    if (a.featured && b.featured) return (a.featured_sort || 0) - (b.featured_sort || 0);
    return a.name.localeCompare(b.name, 'es');
  });

  if (!list.length) { wrap.innerHTML = '<div class="empty">No hay productos que coincidan.</div>'; return; }

  wrap.innerHTML = list.map(p => {
    const isFeat = !!p.featured;
    return `<div class="row${isFeat ? ' feat-on' : ''}">
      <img src="${esc(p.img)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="row-main">
        <div class="row-title">${esc(p.name)}</div>
        <div class="row-meta">${pcats(p).map(c => `<span class="tag">${esc(catLabel(c))}</span>`).join('')}</div>
      </div>
      <label class="feat-check-label">
        <input type="checkbox" class="feat-cb" ${isFeat ? 'checked' : ''} onchange="onFeatToggle(this,${p.id})">
        <span class="feat-check-text">En el hero</span>
      </label>
      <input type="number" class="feat-order" value="${p.featured_sort || 0}" min="0" placeholder="Orden"
             title="Orden en el carrusel (1 = primero)"
             style="${isFeat ? '' : 'visibility:hidden'}"
             oninput="onFeatOrder(this,${p.id})">
    </div>`;
  }).join('');
}

function onFeatToggle(cb, id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  p.featured = cb.checked;
  if (!cb.checked) p.featured_sort = 0;
  _featChanged.add(id);
  const row = cb.closest('.row');
  row?.classList.toggle('feat-on', cb.checked);
  const orderInput = row?.querySelector('.feat-order');
  if (orderInput) orderInput.style.visibility = cb.checked ? '' : 'hidden';
}

function onFeatOrder(input, id) {
  const p = state.products.find(x => x.id === id);
  if (p) { p.featured_sort = parseInt(input.value || '0', 10) || 0; _featChanged.add(id); }
}

async function saveFeatured() {
  if (!_featChanged.size) { toast('Sin cambios que guardar'); return; }
  const btn = $('save-featured-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  const toUpdate = state.products.filter(p => _featChanged.has(p.id));
  const results = await Promise.all(toUpdate.map(p =>
    sb.from('products').update({ featured: !!p.featured, featured_sort: p.featured_sort || 0 }).eq('id', p.id)
  ));

  if (btn) { btn.disabled = false; btn.textContent = 'Guardar cambios'; }

  const firstError = results.find(r => r.error);
  if (firstError?.error) { toast('Error: ' + firstError.error.message, true); return; }

  _featChanged.clear();
  toast(`${toUpdate.length} producto(s) actualizado(s)`);
  renderFeatured();
}

/* ---------- RENDER: CATALOG PICKER ---------- */
function renderCatalogPicker() {
  const wrap = $('catalog-table');
  if (!wrap) return;
  const q = ($('catalog-search')?.value || '').toLowerCase();
  let list = [...state.products];
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || pcats(p).map(catLabel).join(' ').toLowerCase().includes(q));

  // Pinned products first (sorted by catalog_order), then rest alphabetically
  list.sort((a, b) => {
    if (a.catalog_pinned && !b.catalog_pinned) return -1;
    if (!a.catalog_pinned && b.catalog_pinned) return 1;
    if (a.catalog_pinned && b.catalog_pinned) return (a.catalog_order || 0) - (b.catalog_order || 0);
    return a.name.localeCompare(b.name, 'es');
  });

  if (!list.length) { wrap.innerHTML = '<div class="empty">No hay productos que coincidan.</div>'; return; }

  wrap.innerHTML = list.map(p => {
    const isPinned = !!p.catalog_pinned;
    return `<div class="row${isPinned ? ' feat-on' : ''}">
      <img src="${esc(p.img)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="row-main">
        <div class="row-name">${esc(p.name)}</div>
        <div class="row-meta">${pcats(p).map(catLabel).join(', ') || '—'}</div>
      </div>
      <label class="check-row feat-check-label">
        <input type="checkbox" class="feat-cb" ${isPinned ? 'checked' : ''} onchange="onCatalogToggle(this,${p.id})">
        <span class="feat-check-text">Primero en catálogo</span>
      </label>
      <input type="number" class="feat-order" value="${p.catalog_order || 0}" min="0" placeholder="Orden"
             title="Orden en el catálogo (1 = primero)"
             style="${isPinned ? '' : 'visibility:hidden'}"
             oninput="onCatalogOrder(this,${p.id})">
    </div>`;
  }).join('');
}

function onCatalogToggle(cb, id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  p.catalog_pinned = cb.checked;
  if (!cb.checked) p.catalog_order = 0;
  _catalogChanged.add(id);
  const row = cb.closest('.row');
  row?.classList.toggle('feat-on', cb.checked);
  const orderInput = row?.querySelector('.feat-order');
  if (orderInput) orderInput.style.visibility = cb.checked ? '' : 'hidden';
}

function onCatalogOrder(input, id) {
  const p = state.products.find(x => x.id === id);
  if (p) { p.catalog_order = parseInt(input.value || '0', 10) || 0; _catalogChanged.add(id); }
}

async function saveCatalogPins() {
  if (!_catalogChanged.size) { toast('Sin cambios que guardar'); return; }
  const btn = $('save-catalog-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  const toUpdate = state.products.filter(p => _catalogChanged.has(p.id));
  const results = await Promise.all(toUpdate.map(p =>
    sb.from('products').update({ catalog_pinned: !!p.catalog_pinned, catalog_order: p.catalog_order || 0 }).eq('id', p.id)
  ));

  if (btn) { btn.disabled = false; btn.textContent = 'Guardar cambios'; }

  const firstError = results.find(r => r.error);
  if (firstError?.error) { toast('Error: ' + firstError.error.message, true); return; }

  _catalogChanged.clear();
  toast(`${toUpdate.length} producto(s) actualizado(s)`);
  renderCatalogPicker();
}

/* ---------- ORDEN POR CONTEXTO (general / categoría / subcategoría) ---------- */
// Llena el <select> de contexto: General + una opción por categoría y subcategoría.
function populateOrderContext() {
  const sel = $('order-context');
  if (!sel) return;
  const cur = state.orderCtx;
  const catOpts = state.cats.map(c =>
    `<option value="cat:${esc(c.key)}"${cur === 'cat:' + c.key ? ' selected' : ''}>${esc(c.label)}</option>`).join('');
  const subOpts = state.subcats.map(s =>
    `<option value="sub:${esc(s.key)}"${cur === 'sub:' + s.key ? ' selected' : ''}>${esc(subLabel(s.key))} · ${esc(catLabel(s.cat))}</option>`).join('');
  sel.innerHTML =
    `<option value="general"${cur === 'general' ? ' selected' : ''}>General (todo el catálogo)</option>` +
    (catOpts ? `<optgroup label="Por categoría">${catOpts}</optgroup>` : '') +
    (subOpts ? `<optgroup label="Por subcategoría">${subOpts}</optgroup>` : '');
}

// Devuelve { type, key } del contexto activo.
function orderCtxParts() {
  const ctx = state.orderCtx || 'general';
  if (ctx.startsWith('cat:')) return { type: 'cat', key: ctx.slice(4) };
  if (ctx.startsWith('sub:')) return { type: 'sub', key: ctx.slice(4) };
  return { type: 'general', key: '' };
}

// Lee/escribe el valor de orden del producto para el contexto activo.
function orderValOf(p, ctx) {
  if (ctx.type === 'cat') return (p.cat_order    && p.cat_order[ctx.key])    || 0;
  if (ctx.type === 'sub') return (p.subcat_order && p.subcat_order[ctx.key]) || 0;
  return p.sort || 0;
}
function setOrderVal(p, ctx, val) {
  if (ctx.type === 'cat') {
    p.cat_order = { ...(p.cat_order || {}) };
    if (val) p.cat_order[ctx.key] = val; else delete p.cat_order[ctx.key];
  } else if (ctx.type === 'sub') {
    p.subcat_order = { ...(p.subcat_order || {}) };
    if (val) p.subcat_order[ctx.key] = val; else delete p.subcat_order[ctx.key];
  } else {
    p.sort = val;
  }
}

// Ícono "grip" (6 puntitos) que indica que la fila se puede arrastrar.
const ORDER_GRIP_SVG = '<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor"><circle cx="7.5" cy="5" r="1.5"/><circle cx="12.5" cy="5" r="1.5"/><circle cx="7.5" cy="10" r="1.5"/><circle cx="12.5" cy="10" r="1.5"/><circle cx="7.5" cy="15" r="1.5"/><circle cx="12.5" cy="15" r="1.5"/></svg>';

function renderOrder() {
  const wrap = $('order-table');
  if (!wrap) return;
  const ctx = orderCtxParts();
  const q = (state.ordersearch || '').toLowerCase();
  const filtering = !!q;

  // Todos los productos del contexto (todos, si es general).
  const list = state.products.filter(p => {
    if (ctx.type === 'cat') return pcats(p).includes(ctx.key);
    if (ctx.type === 'sub') return psubs(p).includes(ctx.key);
    return true;
  });

  // Orden actual: primero los que tienen orden explícito (asc), después por nombre.
  list.sort((a, b) => {
    const oa = orderValOf(a, ctx), ob = orderValOf(b, ctx);
    if (oa > 0 && ob > 0) return oa - ob;
    if (oa > 0) return -1;
    if (ob > 0) return 1;
    return a.name.localeCompare(b.name, 'es');
  });

  // Posición 1..N de cada producto dentro del contexto completo (aunque se filtre).
  const posOf = new Map(list.map((p, i) => [p, i + 1]));

  const view = filtering
    ? list.filter(p => p.name.toLowerCase().includes(q) || pcats(p).map(catLabel).join(' ').toLowerCase().includes(q))
    : list;

  if (!view.length) { wrap.innerHTML = '<div class="empty">No hay productos en este contexto.</div>'; return; }

  const note = filtering
    ? `<div class="order-note order-note--warn">Estás usando el buscador, así que el arrastre está pausado. Borrá lo que escribiste para poder <strong>reordenar arrastrando</strong>.</div>`
    : `<div class="order-note">Arrastrá cada producto desde el <strong>&#8942;&#8942;</strong> para acomodar el orden. El número de la izquierda es la posición en que se muestra en el sitio. Cuando termines, tocá <strong>Guardar cambios</strong>.</div>`;

  wrap.innerHTML = note +
    `<div class="order-list${filtering ? ' is-filtered' : ''}">` +
    view.map(p => `<div class="order-row" data-id="${esc(String(p.id))}" draggable="${filtering ? 'false' : 'true'}">
      <span class="order-grip" aria-hidden="true">${ORDER_GRIP_SVG}</span>
      <span class="order-pos">${posOf.get(p)}</span>
      <img class="order-thumb" src="${esc(p.img)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="row-main">
        <div class="row-title">${esc(p.name)}</div>
        <div class="row-meta">${pcats(p).map(c => `<span class="tag">${esc(catLabel(c))}</span>`).join('')}${psubs(p).map(s => `<span class="tag tag-sub">${esc(subLabel(s))}</span>`).join('')}</div>
      </div>
    </div>`).join('') +
    `</div>`;
}

/* ── Reordenamiento por arrastre (drag & drop) ──
   Se engancha UNA sola vez sobre #order-table (el contenedor persiste aunque
   las filas se regeneren). Al soltar, se renumeran las posiciones 1..N según
   el orden visual y se marcan los productos que cambiaron para guardarlos. */
let _orderDragEl = null;
function initOrderDnD() {
  const wrap = $('order-table');
  if (!wrap || wrap._dndBound) return;
  wrap._dndBound = true;

  wrap.addEventListener('dragstart', e => {
    const row = e.target.closest('.order-row');
    if (!row || row.getAttribute('draggable') !== 'true') return;
    _orderDragEl = row;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', row.dataset.id); } catch (_) {}
    // Diferir la clase para que la imagen "fantasma" del navegador salga limpia.
    requestAnimationFrame(() => row.classList.add('dragging'));
  });

  wrap.addEventListener('dragover', e => {
    if (!_orderDragEl) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const listEl = _orderDragEl.parentElement;
    const after = orderRowAfter(listEl, e.clientY);
    if (after == null) listEl.appendChild(_orderDragEl);
    else listEl.insertBefore(_orderDragEl, after);
  });

  wrap.addEventListener('drop', e => { if (_orderDragEl) e.preventDefault(); });

  wrap.addEventListener('dragend', () => {
    if (!_orderDragEl) return;
    _orderDragEl.classList.remove('dragging');
    _orderDragEl = null;
    commitOrderFromDom();
  });
}

// Fila (no arrastrada) delante de la cual insertar, según la Y del cursor.
function orderRowAfter(listEl, y) {
  const rows = [...listEl.querySelectorAll('.order-row:not(.dragging)')];
  let closest = null, closestOffset = -Infinity;
  for (const row of rows) {
    const box = row.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = row; }
  }
  return closest;
}

// Lee el orden visual del DOM y lo vuelca a state (posiciones 1..N del contexto).
function commitOrderFromDom() {
  const ctx = orderCtxParts();
  const rows = [...document.querySelectorAll('#order-table .order-row')];
  rows.forEach((row, i) => {
    const p = state.products.find(x => String(x.id) === row.dataset.id);
    if (!p) return;
    const newVal = i + 1;
    if (orderValOf(p, ctx) !== newVal) {
      setOrderVal(p, ctx, newVal);
      _orderChanged.add(p.id);
    }
    const posEl = row.querySelector('.order-pos');
    if (posEl) posEl.textContent = newVal;
  });
  markOrderDirty();
}

// Resalta el botón Guardar mientras haya cambios sin persistir.
function markOrderDirty() {
  const btn = $('save-order-btn');
  if (!btn) return;
  const n = _orderChanged.size;
  btn.classList.toggle('has-changes', n > 0);
  btn.textContent = n > 0 ? `Guardar cambios (${n})` : 'Guardar cambios';
}

async function saveOrder() {
  if (!_orderChanged.size) { toast('Sin cambios que guardar'); return; }
  const btn = $('save-order-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  const toUpdate = state.products.filter(p => _orderChanged.has(p.id));
  const results = await Promise.all(toUpdate.map(p =>
    sb.from('products').update({
      sort: p.sort || 0,
      cat_order: p.cat_order || {},
      subcat_order: p.subcat_order || {},
    }).eq('id', p.id)
  ));

  if (btn) btn.disabled = false;

  const firstError = results.find(r => r.error);
  if (firstError?.error) { markOrderDirty(); toast('Error: ' + firstError.error.message, true); return; }

  _orderChanged.clear();
  markOrderDirty();
  toast(`${toUpdate.length} producto(s) actualizado(s)`);
  renderOrder();
}

/* ---------- HEATMAP DE ACTIVIDAD ---------- */
let _heatDays = 7; // ventana de tiempo seleccionada (null = todo)

async function renderHeatmap() {
  const wrap    = $('heatmap-table');
  const loading = $('heatmap-loading');
  if (!wrap) return;

  wrap.innerHTML = '';
  if (loading) loading.style.display = '';

  // Obtener conteos desde Supabase (RPC agrega en DB, rápido)
  const { data: counts, error } = await sb.rpc('get_product_clicks', {
    days_back: _heatDays || null
  });

  if (loading) loading.style.display = 'none';

  if (error) {
    wrap.innerHTML = `<div class="empty">Error al cargar actividad: ${esc(error.message)}</div>`;
    return;
  }
  if (!counts?.length) {
    wrap.innerHTML = '<div class="empty">Sin registros en el período seleccionado. Las vistas se registran cuando los visitantes abren un producto.</div>';
    return;
  }

  // Merge conteos con datos de productos
  const countMap = Object.fromEntries(counts.map(r => [r.product_id, Number(r.click_count)]));
  const maxCount = Math.max(...Object.values(countMap), 1);

  // Rank list: productos con vistas primero, luego sin datos
  const withViews = state.products
    .filter(p => countMap[p.id])
    .map(p => ({ ...p, _views: countMap[p.id] }))
    .sort((a, b) => b._views - a._views);

  if (!withViews.length) {
    wrap.innerHTML = '<div class="empty">Ningún producto de este catálogo tiene vistas aún en el período seleccionado.</div>';
    return;
  }

  wrap.innerHTML = withViews.map((p, i) => {
    const ratio   = p._views / maxCount;
    const barW    = Math.max(ratio * 100, 2).toFixed(1);
    // Color continuo: de naranja muy claro a naranja sólido
    const opacity = (0.15 + ratio * 0.85).toFixed(2);
    const isPinned = !!p.catalog_pinned;
    return `<div class="row heat-row">
      <span class="heat-rank">${i + 1}</span>
      <img src="${esc(p.img)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="row-main">
        <div class="row-name">${esc(p.name)}</div>
        <div class="heat-bar-wrap">
          <div class="heat-bar" data-w="${barW}" style="background:rgba(244,123,32,${opacity})"></div>
        </div>
      </div>
      <span class="heat-count">${p._views.toLocaleString('es-AR')} vista${p._views !== 1 ? 's' : ''}</span>
      <button class="heat-pin-btn${isPinned ? ' pinned' : ''}"
              onclick="quickPinFromHeatmap(${p.id}, this)"
              title="${isPinned ? 'Ya pinneado al catálogo' : 'Pinear al catálogo'}">
        ${isPinned ? 'Pinneado' : 'Pinear'}
      </button>
    </div>`;
  }).join('');

  // Animar barras desde 0 con stagger — da sensación de "datos llegando"
  requestAnimationFrame(() => {
    wrap.querySelectorAll('.heat-bar').forEach((bar, i) => {
      bar.style.transitionDelay = `${i * 35}ms`;
      bar.style.width = bar.dataset.w + '%';
    });
  });
}

async function quickPinFromHeatmap(id, btn) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;

  // Toggle: si ya está pinneado, lo quitamos; si no, lo pinneamos
  const newPinned = !p.catalog_pinned;
  btn.disabled = true;
  btn.textContent = '…';

  const { error } = await sb.from('products')
    .update({ catalog_pinned: newPinned, catalog_order: newPinned ? (p.catalog_order || 0) : 0 })
    .eq('id', id);

  btn.disabled = false;
  if (error) { toast('Error: ' + error.message, true); btn.textContent = 'Pinear'; return; }

  p.catalog_pinned = newPinned;
  btn.textContent  = newPinned ? 'Pinneado' : 'Pinear';
  btn.classList.toggle('pinned', newPinned);
  toast(newPinned ? `"${p.name}" pinneado al catálogo` : `"${p.name}" quitado del catálogo`);
}

/* ---------- RENDER: SUBCATEGORIES ---------- */
// Rellena el <select> de filtro por categoría con las categorías actuales.
function populateSubcatCatFilter() {
  const sel = $('subcat-cat-filter');
  if (!sel) return;
  const cur = state.sccat;
  sel.innerHTML = `<option value="">Todas</option>` +
    state.cats.map(c => `<option value="${esc(c.key)}"${c.key === cur ? ' selected' : ''}>${esc(c.label)}</option>`).join('');
}

function renderSubcats() {
  const wrap = $('subcats-table');
  const q = state.scsearch.trim().toLowerCase();
  const catFilter = state.sccat;
  let list = [...state.subcats];
  if (catFilter) list = list.filter(s => s.cat === catFilter);
  if (q) {
    list = list.filter(s => {
      if (s.label.toLowerCase().includes(q)) return true;
      // Busca también por nombre de producto: muestra subcats que tengan ese producto
      return state.products.some(p => psubs(p).includes(s.key) && p.name.toLowerCase().includes(q));
    });
  }
  if (!list.length) { wrap.innerHTML = '<div class="empty">Sin subcategorías que coincidan.</div>'; return; }
  wrap.innerHTML = list.map(s => {
    const n = state.products.filter(p => psubs(p).includes(s.key)).length;
    return `
    <div class="row">
      <div class="sort-badge" title="Orden en el catálogo (editá para cambiar)">${s.sort ?? 0}</div>
      <div class="row-main">
        <div class="row-title">${esc(s.label)}</div>
        <div class="row-meta"><span class="tag">${esc(catLabel(s.cat))}</span> ${n} producto${n === 1 ? '' : 's'}</div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" onclick="editSubcat('${esc(s.key)}')">Editar</button>
        <button class="icon-btn danger" onclick="delSubcat('${esc(s.key)}')">Borrar</button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- MODAL ---------- */
let saveHandler = null;
function openModal(title, html, handler) {
  $('modal-title').textContent = title;
  $('modal-form').innerHTML = html;
  $('modal-msg').textContent = '';
  saveHandler = handler;
  $('modal').style.display = 'flex';
}
function closeModal() { $('modal').style.display = 'none'; saveHandler = null; }

function fieldText(name, label, val = '', type = 'text') {
  return `<label class="field"><span>${label}</span><input type="${type}" name="${name}" value="${esc(val)}"></label>`;
}
function fieldArea(name, label, val = '') {
  return `<label class="field"><span>${label}</span><textarea name="${name}">${esc(val)}</textarea></label>`;
}
function fieldSelect(name, label, options, val = '') {
  const opts = options.map(o => `<option value="${esc(o.value)}" ${o.value === val ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
  return `<label class="field"><span>${label}</span><select name="${name}">${opts}</select></label>`;
}
// Grupo de checkboxes (selección múltiple). `opts` = [{value,label,parent?}]
function fieldChecks(name, label, opts, selected = [], hint = '') {
  const set = new Set(selected);
  const boxes = opts.map(o =>
    `<label class="chk" ${o.parent ? `data-parent="${esc(o.parent)}"` : ''}>
       <input type="checkbox" name="${name}" value="${esc(o.value)}" ${set.has(o.value) ? 'checked' : ''}>
       <span>${esc(o.label)}</span>
     </label>`).join('');
  return `<div class="field"><span>${label}</span>
    ${hint ? `<div class="check-hint">${hint}</div>` : ''}
    <div class="check-group" data-group="${name}">${boxes}</div></div>`;
}
const formVal = name => $('modal-form').elements[name]?.value ?? '';
const checkedVals = name => [...$('modal-form').querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);

/* ---------- PRODUCT CRUD ---------- */
function catOptions() { return state.cats.map(c => ({ value: c.key, label: c.label })); }
// Subcategorías agrupadas por su categoría padre, para los checkboxes.
function subCheckOptions() {
  return state.subcats.map(s => ({
    value: s.key,
    label: `${catLabel(s.cat)} › ${s.label}`,
    parent: s.cat,
  }));
}

const BADGE_COLOR_OPTIONS = [
  { value:'green',  label:'Verde'   },
  { value:'red',    label:'Rojo'    },
  { value:'yellow', label:'Amarillo'},
  { value:'orange', label:'Naranja' },
  { value:'blue',   label:'Azul'    },
  { value:'black',  label:'Negro'   },
];

const AVAIL_OPTIONS = [
  { value: 'available',    label: 'Disponible'  },
  { value: 'out_of_stock', label: 'Sin stock'   },
  { value: 'on_request',   label: 'Bajo pedido' },
];

function extraImgRow(url = '') {
  return `<div class="extra-row">
    <input type="text" class="extra-img-input" placeholder="https://... o subí un archivo" value="${esc(url)}">
    <input type="file" class="extra-file-input" accept="image/*" hidden>
    <button type="button" class="icon-btn extra-upload-btn" onclick="triggerExtraUpload(this)">&#8682; Subir</button>
    <button type="button" class="icon-btn danger" onclick="this.closest('.extra-row').remove()" aria-label="Quitar">✕</button>
  </div>`;
}
function extraVidRow(url = '') {
  return `<div class="extra-row">
    <input type="text" class="extra-vid-input" placeholder="https://youtube.com/watch?v=... o subí un archivo" value="${esc(url)}">
    <input type="file" class="extra-file-input" accept="video/*,image/*" hidden>
    <button type="button" class="icon-btn extra-upload-btn" onclick="triggerExtraUpload(this)">&#8682; Subir</button>
    <button type="button" class="icon-btn danger" onclick="this.closest('.extra-row').remove()" aria-label="Quitar">✕</button>
  </div>`;
}

async function uploadMediaFile(file) {
  if (file.size > 50 * 1024 * 1024) { toast('El archivo supera los 50MB.', true); return null; }
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const id  = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
  const path = `products/${id}.${ext}`;
  const { error } = await sb.storage.from(IMG_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    const msg = /bucket/i.test(error.message)
      ? `Falta crear el bucket "${IMG_BUCKET}" en Supabase.`
      : 'Error al subir: ' + error.message;
    toast(msg, true);
    return null;
  }
  return sb.storage.from(IMG_BUCKET).getPublicUrl(path).data?.publicUrl || null;
}

function triggerExtraUpload(btn) {
  const row = btn.closest('.extra-row');
  const fileInput = row?.querySelector('.extra-file-input');
  if (!fileInput) return;
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const orig = btn.innerHTML;
    btn.innerHTML = '...';
    btn.disabled = true;
    const url = await uploadMediaFile(file);
    btn.innerHTML = orig;
    btn.disabled = false;
    if (url) {
      const textInput = row.querySelector('.extra-img-input') || row.querySelector('.extra-vid-input');
      if (textInput) textInput.value = url;
      toast('Archivo subido');
    }
    fileInput.value = '';
  };
  fileInput.click();
}

function productForm(p) {
  const selCats = p ? pcats(p) : (state.cats[0] ? [state.cats[0].key] : []);
  const selSubs = p ? psubs(p) : [];
  const isFeatured = !!p?.featured;
  const relatedIds = new Set((p?.related_ids || []).map(Number));
  const extraImgs = Array.isArray(p?.images) ? p.images.filter(Boolean) : [];
  const extraVids = Array.isArray(p?.videos) ? p.videos.filter(Boolean) : [];

  const relatedBoxes = state.products
    .filter(x => x.id !== (p?.id || 0))
    .map(x =>
      `<label class="chk">
         <input type="checkbox" name="related_ids" value="${x.id}" ${relatedIds.has(x.id) ? 'checked' : ''}>
         <span>${esc(x.name)}</span>
       </label>`
    ).join('');

  const imgRows = extraImgs.length ? extraImgs.map(extraImgRow).join('') : '';
  const vidRows = extraVids.length ? extraVids.map(extraVidRow).join('') : '';

  return `
    ${fieldText('name','Nombre del producto', p?.name || '')}
    ${fieldChecks('cats','Categorías', catOptions(), selCats, 'Podés elegir más de una.')}
    ${fieldChecks('subcats','Subcategorías', subCheckOptions(), selSubs, 'Se muestran las de las categorías elegidas.')}
    ${imageField(p?.img || '')}
    <div class="field">
      <span>Imágenes adicionales (galería)</span>
      <div class="check-hint">Fotos extra que aparecen en la galería del producto, además de la imagen principal.</div>
      <div id="extra-imgs" class="extra-list">${imgRows}</div>
      <button type="button" id="add-extra-img-btn" class="btn-ghost extra-add-btn">+ Agregar imagen</button>
    </div>
    <div class="field">
      <span>Videos</span>
      <div class="check-hint">URLs de YouTube u otros videos. Se muestran en la página del producto.</div>
      <div id="extra-vids" class="extra-list">${vidRows}</div>
      <button type="button" id="add-extra-vid-btn" class="btn-ghost extra-add-btn">+ Agregar video</button>
    </div>
    ${fieldText('short','Descripción corta', p?.short || '')}
    ${fieldArea('descr','Descripción completa', p?.descr || '')}
    <div class="field">
      <span>Productos recomendados</span>
      <div class="check-hint">Se muestran abajo en la página del producto. Si no elegís ninguno, se muestran los de la misma categoría.</div>
      <div class="check-group" id="related-group">${relatedBoxes}</div>
    </div>
    <label class="check-row"><input type="checkbox" name="active" ${(!p || p.active) ? 'checked' : ''}> <span>Visible en el sitio</span></label>
    <label class="check-row"><input type="checkbox" name="featured" id="feat-cb" ${isFeatured ? 'checked' : ''}> <span>Destacado en el hero (inicio)</span></label>
    <label class="field feat-sort-row" id="feat-sort-row" style="${isFeatured ? '' : 'display:none'}">
      <span>Orden en el hero (menor = primero)</span>
      <input type="number" name="featured_sort" value="${p?.featured_sort || 0}" min="0" style="max-width:100px">
    </label>
    ${fieldSelect('availability', 'Disponibilidad', AVAIL_OPTIONS, p?.availability || 'available')}
    <div class="field">
      <span>ETIQUETA DEL PRODUCTO</span>
      <div class="check-hint">
        Un cartelito de color que aparece sobre la foto del producto.
        Ejemplos: <b>EN OFERTA</b>, <b>NUEVO</b>, <b>LIQUIDACIÓN</b>.
        Podés escribir el texto y elegir el color. Activá el interruptor para que se vea en el sitio;
        desactivalo para ocultarlo sin borrar el texto.
      </div>
      <label class="check-row" style="margin-bottom:10px">
        <input type="checkbox" name="badge_enabled" id="badge-enabled-cb" ${p?.badge_enabled ? 'checked' : ''}>
        <strong>Mostrar etiqueta en el sitio</strong>
      </label>
      <div id="badge-fields" style="${p?.badge_enabled ? '' : 'display:none'}">
        ${fieldText('badge', 'Texto de la etiqueta (ej: EN OFERTA, NUEVO, LIQUIDACIÓN)', p?.badge || '')}
        ${fieldSelect('badge_color', 'Color de la etiqueta', BADGE_COLOR_OPTIONS, p?.badge_color || 'green')}
      </div>
    </div>`;
}

// Campo de imagen: zona para arrastrar/soltar (o clic) que muestra la miniatura
// de la imagen actual + URL manual de respaldo.
function imageField(val) {
  return `<div class="field"><span>Imagen</span>
    <div class="check-hint">Arrastrá un archivo, hacé clic para elegirlo, o pegá una URL abajo.</div>
    <div class="dropzone${val ? ' has-img' : ''}" id="img-drop" tabindex="0" role="button" aria-label="Subir imagen">
      <img class="dz-thumb" alt="" ${val ? `src="${esc(val)}"` : 'style="display:none"'}>
      <div class="dz-inner"><span class="dz-icon">&#8682;</span><span class="dz-text">Soltá la imagen acá o hacé clic</span></div>
    </div>
    <input type="file" id="img-file" accept="image/*" hidden>
    <input type="text" name="img" value="${esc(val)}" placeholder="https://... o subí un archivo" style="margin-top:8px">
  </div>`;
}

// Muestra solo las subcategorías cuyas categorías padre están tildadas.
function syncSubcatVisibility() {
  const checkedCats = new Set(checkedVals('cats'));
  $('modal-form').querySelectorAll('.chk[data-parent]').forEach(lbl => {
    const show = checkedCats.has(lbl.dataset.parent);
    lbl.style.display = show ? '' : 'none';
    if (!show) { const cb = lbl.querySelector('input'); if (cb) cb.checked = false; }
  });
}
function bindProductForm() {
  const form = $('modal-form');
  form.querySelectorAll('input[name="cats"]').forEach(cb =>
    cb.addEventListener('change', syncSubcatVisibility));
  const imgEl = form.elements['img'];
  if (imgEl) imgEl.addEventListener('input', refreshThumb);
  bindDropzone();
  syncSubcatVisibility();
  refreshThumb();

  // Featured toggle → show/hide sort field
  const featCb = $('feat-cb');
  const featSortRow = $('feat-sort-row');
  if (featCb && featSortRow) {
    featCb.addEventListener('change', () => {
      featSortRow.style.display = featCb.checked ? '' : 'none';
    });
  }

  // Badge enabled toggle
  const badgeCb = $('badge-enabled-cb');
  const badgeFields = $('badge-fields');
  if (badgeCb && badgeFields) {
    badgeCb.addEventListener('change', () => {
      badgeFields.style.display = badgeCb.checked ? '' : 'none';
    });
  }

  // Extra images
  const addImgBtn = $('add-extra-img-btn');
  if (addImgBtn) {
    addImgBtn.addEventListener('click', () => {
      $('extra-imgs').insertAdjacentHTML('beforeend', extraImgRow(''));
    });
  }

  // Extra videos
  const addVidBtn = $('add-extra-vid-btn');
  if (addVidBtn) {
    addVidBtn.addEventListener('click', () => {
      $('extra-vids').insertAdjacentHTML('beforeend', extraVidRow(''));
    });
  }
}

// Refresca la miniatura del dropzone según la URL actual del campo "img".
function refreshThumb() {
  const dz = $('img-drop');
  if (!dz) return;
  const img = (formVal('img') || '').trim();
  const thumb = dz.querySelector('.dz-thumb');
  if (img) {
    thumb.src = img;
    thumb.style.display = '';
    dz.classList.add('has-img');
  } else {
    thumb.removeAttribute('src');
    thumb.style.display = 'none';
    dz.classList.remove('has-img');
  }
}

/* ---------- IMAGEN: DRAG & DROP + UPLOAD ---------- */
function bindDropzone() {
  const dz = $('img-drop'), file = $('img-file');
  if (!dz || !file) return;
  dz.addEventListener('click', () => file.click());
  dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  file.addEventListener('change', () => { if (file.files[0]) handleImageFile(file.files[0]); });
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'dragend'].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove('drag')));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) handleImageFile(f);
  });
}

async function handleImageFile(file) {
  if (!file.type.startsWith('image/')) { toast('El archivo tiene que ser una imagen.', true); return; }
  if (file.size > 5 * 1024 * 1024) { toast('La imagen no puede superar los 5MB.', true); return; }
  const dz = $('img-drop'), txt = dz?.querySelector('.dz-text');
  dz?.classList.add('uploading');
  if (txt) txt.textContent = 'Subiendo...';
  const url = await uploadImage(file);
  dz?.classList.remove('uploading');
  if (txt) txt.textContent = 'Soltá la imagen acá o hacé clic';
  if (url) {
    $('modal-form').elements['img'].value = url;
    refreshThumb();
    toast('Imagen subida');
  }
}

async function uploadImage(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const id  = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
  const path = `products/${id}.${ext}`;
  const { error } = await sb.storage.from(IMG_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    const msg = /bucket/i.test(error.message)
      ? `Falta crear el bucket "${IMG_BUCKET}" en Supabase (corré el SQL de Storage).`
      : 'Error al subir: ' + error.message;
    toast(msg, true);
    return null;
  }
  return sb.storage.from(IMG_BUCKET).getPublicUrl(path).data?.publicUrl || null;
}

function newProduct() {
  openModal('Nuevo producto', productForm(null), async () => {
    const payload = collectProduct();
    if (!payload) return;
    const { error } = await sb.from('products').insert(payload);
    afterSave(error, 'Producto creado');
  });
  bindProductForm();
}
function editProduct(id) {
  const p = state.products.find(x => x.id === id);
  openModal('Editar producto', productForm(p), async () => {
    const payload = collectProduct();
    if (!payload) return;
    const { error } = await sb.from('products').update(payload).eq('id', id);
    afterSave(error, 'Producto actualizado');
  });
  bindProductForm();
}
function collectProduct() {
  const name = formVal('name').trim();
  if (!name) { $('modal-msg').textContent = 'El nombre es obligatorio.'; return null; }
  const cats = checkedVals('cats');
  if (!cats.length) { $('modal-msg').textContent = 'Elegí al menos una categoría.'; return null; }
  const subcats = checkedVals('subcats');

  const images = [...$('modal-form').querySelectorAll('.extra-img-input')]
    .map(i => i.value.trim()).filter(Boolean);
  const videos = [...$('modal-form').querySelectorAll('.extra-vid-input')]
    .map(i => i.value.trim()).filter(Boolean);
  const related_ids = checkedVals('related_ids').map(Number);

  const featCb = $('feat-cb');
  const featured = featCb ? featCb.checked : false;
  const featured_sort = parseInt(formVal('featured_sort') || '0', 10) || 0;

  return {
    name, slug: slugify(name),
    cats, subcats,
    img: formVal('img').trim(),
    images, videos, related_ids,
    short: formVal('short').trim(),
    descr: formVal('descr').trim(),
    active: $('modal-form').elements['active'].checked,
    featured, featured_sort,
    availability: formVal('availability') || 'available',
    badge: formVal('badge').trim(),
    badge_color: formVal('badge_color') || 'green',
    badge_enabled: !!$('modal-form').elements['badge_enabled']?.checked,
  };
}
async function delProduct(id) {
  const p = state.products.find(x => x.id === id);
  if (!confirm(`¿Borrar "${p?.name}"? Esta acción no se puede deshacer.`)) return;
  const { error } = await sb.from('products').delete().eq('id', id);
  afterSave(error, 'Producto borrado');
}

/* ---------- IMPORTACIÓN MASIVA ---------- */
function importProducts() {
  const example = JSON.stringify([
    {
      name: 'Producto de ejemplo',
      cats: [state.cats[0]?.key || 'construccion'],
      subcats: [],
      img: 'https://...',
      short: 'Descripción corta',
      descr: 'Descripción completa',
      active: true,
    },
  ], null, 2);
  const catList = state.cats.map(c => c.key).join(', ') || '(creá categorías primero)';
  openModal('Importar productos',
    `<div class="check-hint">Pegá un <b>array JSON</b>. Obligatorios: <b>name</b> y <b>cats</b>. Opcionales: <code>subcats, img, short, descr, active</code>.</div>
     <div class="check-hint">Categorías válidas: ${esc(catList)}</div>
     <label class="field"><span>Productos (JSON)</span>
       <textarea name="bulk" class="bulk" spellcheck="false">${esc(example)}</textarea>
     </label>`,
    doBulkImport);
}

async function doBulkImport() {
  const msg = $('modal-msg');
  let arr;
  try { arr = JSON.parse(formVal('bulk')); }
  catch (e) { msg.textContent = 'JSON inválido: ' + e.message; return; }
  if (!Array.isArray(arr) || !arr.length) { msg.textContent = 'Pegá un array con al menos un producto.'; return; }

  const validCats = new Set(state.cats.map(c => c.key));
  const validSubs = new Set(state.subcats.map(s => s.key));
  const rows = [];
  for (let i = 0; i < arr.length; i++) {
    const p = arr[i] || {};
    const n = `Fila ${i + 1}`;
    if (!p.name || !String(p.name).trim()) { msg.textContent = `${n}: falta "name".`; return; }
    const cats = Array.isArray(p.cats) ? p.cats : (p.cat ? [p.cat] : []);
    if (!cats.length) { msg.textContent = `${n} (${p.name}): falta al menos una categoría en "cats".`; return; }
    const badCat = cats.find(c => !validCats.has(c));
    if (badCat) { msg.textContent = `${n} (${p.name}): categoría inexistente "${badCat}".`; return; }
    const subs = Array.isArray(p.subcats) ? p.subcats : (p.subcat ? [p.subcat] : []);
    const badSub = subs.find(s => !validSubs.has(s));
    if (badSub) { msg.textContent = `${n} (${p.name}): subcategoría inexistente "${badSub}".`; return; }
    rows.push({
      name: String(p.name).trim(),
      slug: String(p.slug || p.name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      cats, subcats: subs,
      img: p.img || '', short: p.short || '', descr: p.descr || '',
      active: p.active !== false,
    });
  }
  const { error } = await sb.from('products').insert(rows);
  if (error) { msg.textContent = 'Error: ' + error.message; toast('Error al importar', true); return; }
  closeModal();
  toast(`${rows.length} producto(s) importado(s)`);
  await loadAll();
}

/* ---------- CATEGORY CRUD ---------- */
function catForm(c, isNew) {
  const cur = c?.icon || (isNew ? PRESET_ICONS[0].svg : '');
  const isCustom = !!cur && !PRESET_ICONS.some(ic => ic.svg === cur);
  const choices = PRESET_ICONS.map(ic =>
    `<button type="button" class="icon-choice${!isCustom && cur === ic.svg ? ' sel' : ''}" data-svg="${esc(ic.svg)}" title="${esc(ic.name)}">${ic.svg}</button>`
  ).join('');

  // Solo cuando se EDITA (no al crear) mostramos la lista de productos
  // para asignar/quitar directamente desde acá.
  let productsPicker = '';
  if (!isNew && c) {
    const inCat = state.products.filter(p => pcats(p).includes(c.key));
    const outCat = state.products.filter(p => !pcats(p).includes(c.key));
    productsPicker = `
      <div class="field cat-products-field">
        <span>Productos en esta categoría <span class="count-badge" id="cat-prod-count">${inCat.length}</span></span>
        <div class="check-hint">
          Tildá los productos para que pertenezcan a <b>${esc(c.label)}</b>.
          Destildá para quitarlos. Los cambios se guardan al apretar <b>Guardar</b>.
        </div>
        <input type="text" id="cat-prod-search" class="cat-prod-search" placeholder="Buscar producto...">
        <div class="cat-products-list" data-cat-key="${esc(c.key)}">
          ${[...inCat, ...outCat].map(p => {
            const checked = pcats(p).includes(c.key);
            return `<label class="cat-prod-item${checked ? ' on' : ''}">
              <input type="checkbox" name="cat_products" value="${p.id}" ${checked ? 'checked' : ''}>
              <img src="${esc(p.img || '')}" alt="" onerror="this.style.visibility='hidden'">
              <span class="cat-prod-name">${esc(p.name)}</span>
              <span class="cat-prod-meta">${pcats(p).map(k => esc(catLabel(k))).join(', ') || '—'}</span>
            </label>`;
          }).join('')}
        </div>
      </div>`;
  }

  return `
    ${fieldText('label','Nombre de la categoría', c?.label || '')}
    ${fieldText('sort','Orden en el catálogo (menor = primero)', String(c?.sort ?? ''), 'number')}
    <div class="field"><span>Ícono</span>
      <div class="check-hint">Tocá uno para elegirlo.</div>
      <div class="icon-picker">${choices}</div>
      <input type="hidden" name="icon" value="${esc(cur)}">
      <details class="adv"${isCustom ? ' open' : ''}>
        <summary>Usar otro ícono (avanzado)</summary>
        <textarea name="iconCustom" placeholder="Pegá acá el código SVG">${isCustom ? esc(cur) : ''}</textarea>
      </details>
    </div>
    ${productsPicker}`;
}

// Filtro en vivo + contador de la lista de productos del editor de categorías/subcategorías.
function bindAssignProductsPicker() {
  const search = $('cat-prod-search');
  const list   = $('modal-form')?.querySelector('.cat-products-list');
  const count  = $('cat-prod-count');
  if (!list) return;

  function refreshCount() {
    if (!count) return;
    count.textContent = list.querySelectorAll('input[type="checkbox"]:checked').length;
  }
  list.addEventListener('change', e => {
    if (e.target.matches('input[type="checkbox"]')) {
      e.target.closest('.cat-prod-item')?.classList.toggle('on', e.target.checked);
      refreshCount();
    }
  });
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      list.querySelectorAll('.cat-prod-item').forEach(el => {
        const txt = el.querySelector('.cat-prod-name')?.textContent.toLowerCase() || '';
        el.style.display = !q || txt.includes(q) ? '' : 'none';
      });
    });
  }
  refreshCount();
}

// Aplica los cambios de asignación de productos al guardar una categoría o subcategoría.
// `field` es 'cats' o 'subcats'. `key` es la categoría/subcategoría editada.
// Devuelve un objeto con cuántos productos se agregaron / quitaron.
async function applyProductAssignments(field, key) {
  const list = $('modal-form')?.querySelector('.cat-products-list');
  if (!list) return { added: 0, removed: 0, errors: [] };
  const desiredIds = new Set(
    [...list.querySelectorAll('input[name="cat_products"]:checked')].map(i => Number(i.value))
  );
  const updates = [];
  for (const p of state.products) {
    const arr = field === 'cats' ? pcats(p) : psubs(p);
    const has = arr.includes(key);
    const should = desiredIds.has(p.id);
    if (has === should) continue;
    const next = should ? [...new Set([...arr, key])] : arr.filter(k => k !== key);
    updates.push({ id: p.id, next, was: has });
  }
  const results = await Promise.all(updates.map(u =>
    sb.from('products').update({ [field]: u.next }).eq('id', u.id)
  ));
  const errors = results.filter(r => r.error).map(r => r.error.message);
  return {
    added:   updates.filter(u => !u.was).length,
    removed: updates.filter(u =>  u.was).length,
    errors,
  };
}
// Conecta los botones del selector de íconos y el campo SVG avanzado.
function bindCatForm() {
  const form = $('modal-form');
  const hidden = form.elements['icon'];
  const custom = form.elements['iconCustom'];
  form.querySelectorAll('.icon-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      form.querySelectorAll('.icon-choice').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      hidden.value = btn.dataset.svg;
      if (custom) custom.value = '';
    });
  });
  if (custom) custom.addEventListener('input', () => {
    if (custom.value.trim()) {
      form.querySelectorAll('.icon-choice').forEach(b => b.classList.remove('sel'));
      hidden.value = custom.value.trim();
    }
  });
}
function newCat() {
  openModal('Nueva categoría', catForm(null, true), async () => {
    const label = formVal('label').trim();
    if (!label) { $('modal-msg').textContent = 'Escribí el nombre de la categoría.'; return; }
    const key = slugify(label);
    if (!key) { $('modal-msg').textContent = 'Ese nombre no es válido, probá con otro.'; return; }
    const icon = formVal('iconCustom').trim() || formVal('icon').trim() || DEFAULT_CAT_ICON;
    const sort = Math.max(0, ...state.cats.map(c => c.sort || 0)) + 1;
    const { error } = await sb.from('categories').insert({ key, label, icon, sort });
    afterSave(error, 'Categoría creada');
  });
  bindCatForm();
}
function editCat(key) {
  const c = state.cats.find(x => x.key === key);
  openModal('Editar categoría', catForm(c, false), async () => {
    const label = formVal('label').trim();
    if (!label) { $('modal-msg').textContent = 'Escribí el nombre de la categoría.'; return; }
    const icon = formVal('iconCustom').trim() || formVal('icon').trim() || c.icon || DEFAULT_CAT_ICON;
    const sort = parseInt(formVal('sort') || '0', 10);
    const { error } = await sb.from('categories').update({ label, icon, sort }).eq('key', key);
    if (error) { afterSave(error, ''); return; }
    const diff = await applyProductAssignments('cats', key);
    if (diff.errors.length) {
      $('modal-msg').textContent = 'Categoría guardada, pero falló al asignar productos: ' + diff.errors[0];
      toast('Error parcial al asignar productos', true);
      await loadAll();
      return;
    }
    closeModal();
    const parts = ['Categoría actualizada'];
    if (diff.added)   parts.push(`+${diff.added} producto(s)`);
    if (diff.removed) parts.push(`-${diff.removed} producto(s)`);
    toast(parts.join(' · '));
    await loadAll();
  });
  bindCatForm();
  bindAssignProductsPicker();
}
async function delCat(key) {
  const n = state.products.filter(p => pcats(p).includes(key)).length;
  if (n > 0) { alert(`No se puede borrar: tiene ${n} productos. Reasignalos primero.`); return; }
  if (!confirm('¿Borrar esta categoría?')) return;
  const { error } = await sb.from('categories').delete().eq('key', key);
  afterSave(error, 'Categoría borrada');
}

/* ---------- SUBCATEGORY CRUD ---------- */
function subcatForm(s, isNew) {
  let productsPicker = '';
  if (!isNew && s) {
    // Para subcategorías mostramos primero los productos de la categoría padre
    // (lo que tiene sentido asignar acá), pero permitimos buscar entre todos.
    const inSub = state.products.filter(p => psubs(p).includes(s.key));
    const inParentCat = state.products.filter(p =>
      !psubs(p).includes(s.key) && pcats(p).includes(s.cat));
    const rest = state.products.filter(p =>
      !psubs(p).includes(s.key) && !pcats(p).includes(s.cat));
    const ordered = [...inSub, ...inParentCat, ...rest];
    productsPicker = `
      <div class="field cat-products-field">
        <span>Productos en esta subcategoría <span class="count-badge" id="cat-prod-count">${inSub.length}</span></span>
        <div class="check-hint">
          Tildá los productos para asignarlos a <b>${esc(s.label)}</b>.
          Se muestran primero los de la categoría padre <b>${esc(catLabel(s.cat))}</b>.
        </div>
        <input type="text" id="cat-prod-search" class="cat-prod-search" placeholder="Buscar producto...">
        <div class="cat-products-list" data-sub-key="${esc(s.key)}">
          ${ordered.map(p => {
            const checked = psubs(p).includes(s.key);
            const parentMatch = pcats(p).includes(s.cat);
            return `<label class="cat-prod-item${checked ? ' on' : ''}${parentMatch ? '' : ' dim'}">
              <input type="checkbox" name="cat_products" value="${p.id}" ${checked ? 'checked' : ''}>
              <img src="${esc(p.img || '')}" alt="" onerror="this.style.visibility='hidden'">
              <span class="cat-prod-name">${esc(p.name)}</span>
              <span class="cat-prod-meta">${pcats(p).map(k => esc(catLabel(k))).join(', ') || '—'}</span>
            </label>`;
          }).join('')}
        </div>
      </div>`;
  }
  return `
    ${fieldSelect('cat','¿A qué categoría pertenece?', catOptions(), s?.cat || state.cats[0]?.key || '')}
    ${fieldText('label','Nombre de la subcategoría', s?.label || '')}
    ${fieldText('sort','Orden en el catálogo (menor = primero)', String(s?.sort ?? ''), 'number')}
    ${productsPicker}`;
}
function newSubcat() {
  openModal('Nueva subcategoría', subcatForm(null, true), async () => {
    const label = formVal('label').trim();
    if (!label) { $('modal-msg').textContent = 'Escribí el nombre de la subcategoría.'; return; }
    const cat = formVal('cat');
    if (!cat) { $('modal-msg').textContent = 'Elegí a qué categoría pertenece.'; return; }
    const key = slugify(label);
    if (!key) { $('modal-msg').textContent = 'Ese nombre no es válido, probá con otro.'; return; }
    const sort = Math.max(0, ...state.subcats.map(s => s.sort || 0)) + 1;
    const { error } = await sb.from('subcategories').insert({ key, cat, label, sort });
    afterSave(error, 'Subcategoría creada');
  });
}
function editSubcat(key) {
  const s = state.subcats.find(x => x.key === key);
  openModal('Editar subcategoría', subcatForm(s, false), async () => {
    const label = formVal('label').trim();
    if (!label) { $('modal-msg').textContent = 'Escribí el nombre de la subcategoría.'; return; }
    const sort = parseInt(formVal('sort') || '0', 10);
    const { error } = await sb.from('subcategories').update({ cat: formVal('cat'), label, sort }).eq('key', key);
    if (error) { afterSave(error, ''); return; }
    const diff = await applyProductAssignments('subcats', key);
    if (diff.errors.length) {
      $('modal-msg').textContent = 'Subcategoría guardada, pero falló al asignar productos: ' + diff.errors[0];
      toast('Error parcial al asignar productos', true);
      await loadAll();
      return;
    }
    closeModal();
    const parts = ['Subcategoría actualizada'];
    if (diff.added)   parts.push(`+${diff.added} producto(s)`);
    if (diff.removed) parts.push(`-${diff.removed} producto(s)`);
    toast(parts.join(' · '));
    await loadAll();
  });
  bindAssignProductsPicker();
}
async function delSubcat(key) {
  const n = state.products.filter(p => psubs(p).includes(key)).length;
  if (n > 0 && !confirm(`Tiene ${n} productos asignados (se les quitará esta subcategoría). ¿Continuar?`)) return;
  if (n === 0 && !confirm('¿Borrar esta subcategoría?')) return;
  const { error } = await sb.from('subcategories').delete().eq('key', key);
  afterSave(error, 'Subcategoría borrada');
}

/* ---------- BANNER TAB ---------- */
async function renderBannerTab() {
  const { data } = await sb.from('banner').select('text, active').eq('id', 1).maybeSingle();
  const textInput = $('banner-text');
  const activeToggle = $('banner-active');
  if (data) {
    if (textInput) textInput.value = data.text || '';
    if (activeToggle) activeToggle.checked = !!data.active;
  }
  updateBannerPreview();
}

function updateBannerPreview() {
  const prev = $('banner-preview');
  const textInput = $('banner-text');
  if (!prev || !textInput) return;
  const txt = textInput.value.trim();
  prev.style.display = txt ? '' : 'none';
  const span = prev.querySelector('.bp-text');
  if (span) span.textContent = txt;
}

async function saveBanner() {
  const textInput = $('banner-text');
  const activeToggle = $('banner-active');
  if (!textInput || !activeToggle) return;
  const btn = $('save-banner-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  const { error } = await sb.from('banner')
    .upsert({ id: 1, text: textInput.value.trim(), active: activeToggle.checked });
  if (btn) { btn.disabled = false; btn.textContent = 'Guardar banner'; }
  if (error) { toast('Error: ' + error.message, true); return; }
  toast(activeToggle.checked ? 'Banner activado y guardado' : 'Banner guardado (inactivo)');
}

/* ---------- SAVE HELPER ---------- */
async function afterSave(error, okMsg) {
  if (error) {
    const friendly = error.code === '23505'
      ? 'Ya existe una con ese nombre. Probá con otro.'
      : 'Error: ' + error.message;
    $('modal-msg').textContent = friendly;
    toast('No se pudo guardar', true);
    return;
  }
  closeModal();
  toast(okMsg);
  await loadAll();
}

/* =====================================================================
   ESTADÍSTICAS DEL SITIO  (tab "📊 Estadísticas")
   Lee la tabla analytics_events y arma el panel completo: KPIs con
   comparativa contra el período anterior, gráficos, rankings, mapa de
   calor horario y el explorador de recorridos de cada visitante.
   ===================================================================== */
const DAY_MS = 86400000;
let _statsDays = 7;              // ventana seleccionada (null = siempre)
let _statsLoading = false;
const statsCharts = {};          // instancias de Chart.js a destruir en cada render
const STC = ['#F47B20','#0f0f0f','#2E86DE','#27AE60','#8E44AD','#E74C3C','#16A085','#F1C40F','#7F8C8D','#2980B9','#D35400','#C0392B'];

const EV_LABEL = {
  session_start:      ['Entró al sitio', '🚪'],
  pageview:           ['Vio una página', '📄'],
  product_view:       ['Abrió un producto', '🔍'],
  product_impression: ['Vio un producto en el catálogo', '👁️'],
  search:             ['Buscó', '🔎'],
  filter_category:    ['Filtró por categoría', '🗂️'],
  filter_subcategory: ['Filtró por subcategoría', '🏷️'],
  load_more:          ['Cargó más productos', '⬇️'],
  whatsapp_click:     ['Consultó por WhatsApp', '💬'],
  outbound_click:     ['Salió del sitio', '↗️'],
  page_time:          ['Tiempo en la página', '⏱️'],
  geo:                ['Ubicación', '📍'],
};

const DEVICE_ICON = { mobile:'📱', desktop:'💻', tablet:'📲' };

// Código de país ISO-2 -> emoji de bandera.
function flag(cc) {
  if (!cc || cc.length !== 2) return '🏳️';
  return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function prodName(id) {
  const p = state.products.find(x => Number(x.id) === Number(id));
  return p ? p.name : ('Producto #' + id);
}
function prodImg(id) {
  const p = state.products.find(x => Number(x.id) === Number(id));
  return p ? p.img : '';
}
function fmtDur(sec) {
  sec = Math.round(sec || 0);
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return m + 'm ' + (s ? s + 's' : '').trim();
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}
function pct(n) { return (n * 100).toFixed(n >= 0.1 ? 0 : 1) + '%'; }

// Trae eventos desde una fecha (paginado, hasta un tope de seguridad).
async function statsFetch(sinceISO, cap = 50000) {
  const out = [];
  let from = 0; const PAGE = 1000;
  while (out.length < cap) {
    let q = sb.from('analytics_events')
      .select('created_at,session_id,visitor_id,type,path,product_id,query,meta')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (sinceISO) q = q.gte('created_at', sinceISO);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || !data.length) break;
    out.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

function statsSetupMessage(msg) {
  return `<div style="text-align:center;padding:10px 0">
    <div style="font-size:2.2rem;margin-bottom:8px">📊</div>
    <div style="font-weight:800;font-size:1.05rem;margin-bottom:8px">Falta activar las estadísticas</div>
    <p style="color:var(--g700);max-width:560px;margin:0 auto 14px;line-height:1.5">
      Todavía no existe la tabla de eventos en Supabase. Corré una sola vez el archivo
      <code style="background:var(--g200);padding:2px 6px;border-radius:5px">analytics-schema.sql</code>
      en <strong>Supabase → SQL Editor</strong> y volvé a entrar. A partir de ahí se registra
      automáticamente todo lo que hacen los visitantes.
    </p>
    ${msg ? `<div style="color:var(--g500);font-size:.78rem">${esc(msg)}</div>` : ''}
  </div>`;
}

async function renderStats() {
  if (_statsLoading) return;
  _statsLoading = true;
  const body = $('stats-body'), loading = $('stats-loading'), errBox = $('stats-error');
  errBox.style.display = 'none';
  if (!body.style.display || body.style.display === 'none') loading.style.display = '';
  else loading.style.display = '';

  try {
    const now = Date.now();
    let curStart, prevStart, curStartMs, prevStartMs, sinceISO, hasPrev, spanMs;
    if (_statsDays == null) {
      // Siempre
      curStartMs = 0; prevStartMs = null; sinceISO = null; hasPrev = false;
    } else if (_statsDays === 1) {
      const d = new Date(); d.setHours(0, 0, 0, 0);
      curStartMs = d.getTime();
      prevStartMs = curStartMs - DAY_MS;
      sinceISO = new Date(prevStartMs).toISOString();
      hasPrev = true;
    } else {
      spanMs = _statsDays * DAY_MS;
      curStartMs = now - spanMs;
      prevStartMs = now - 2 * spanMs;
      sinceISO = new Date(prevStartMs).toISOString();
      hasPrev = true;
    }

    const all = await statsFetch(sinceISO);
    loading.style.display = 'none';
    body.style.display = 'block';

    // Partir en período actual / anterior
    const cur = [], prev = [];
    for (const e of all) {
      const t = new Date(e.created_at).getTime();
      if (t >= curStartMs) cur.push(e);
      else if (hasPrev && t >= prevStartMs) prev.push(e);
    }
    if (_statsDays == null && all.length) curStartMs = new Date(all[0].created_at).getTime();

    computeAndRender(cur, prev, hasPrev, { now, curStartMs });
  } catch (err) {
    loading.style.display = 'none';
    body.style.display = 'none';
    errBox.style.display = 'block';
    const missing = /relation|does not exist|analytics_events|schema cache|42P01|Could not find the table/i.test(err.message || '');
    errBox.innerHTML = statsSetupMessage(missing ? '' : ('Detalle: ' + (err.message || err)));
  } finally {
    _statsLoading = false;
  }
}

function computeAndRender(cur, prev, hasPrev, ctx) {
  // ---- Agrupar por sesión (para device/fuente/duración/recorrido) ----
  const buildSessions = (events) => {
    const map = new Map();
    for (const e of events) {
      let s = map.get(e.session_id);
      if (!s) { s = { id: e.session_id, visitor: e.visitor_id, events: [], start: e.created_at, end: e.created_at, meta: {} }; map.set(e.session_id, s); }
      s.events.push(e);
      if (e.created_at < s.start) s.start = e.created_at;
      if (e.created_at > s.end) s.end = e.created_at;
      if (e.type === 'session_start') s.meta = Object.assign(s.meta, e.meta || {});
      if (e.type === 'geo') s.meta = Object.assign(s.meta, e.meta || {}); // país/provincia/ciudad/IP/ISP
      // fallback device desde pageview
      if (!s.meta.device && e.meta && e.meta.device) s.meta.device = e.meta.device;
    }
    return [...map.values()];
  };
  const sessions = buildSessions(cur);
  const prevSessions = buildSessions(prev);

  const count = (arr, t) => arr.filter(e => e.type === t).length;
  const uniq = (arr, f) => new Set(arr.map(f).filter(Boolean)).size;

  // ---- KPIs ----
  const durOf = (ss) => { const d = ss.filter(s => s.events.length > 1).map(s => (new Date(s.end) - new Date(s.start)) / 1000); return d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0; };
  const convSessions = (ss) => ss.filter(s => s.events.some(e => e.type === 'whatsapp_click')).length;
  const bounce = (ss) => { if (!ss.length) return 0; const b = ss.filter(s => { const pv = s.events.filter(e => e.type === 'pageview').length; const engaged = s.events.some(e => ['product_view', 'search', 'filter_category', 'filter_subcategory', 'whatsapp_click', 'load_more'].includes(e.type)); return pv <= 1 && !engaged; }).length; return b / ss.length; };

  const K = (events, ss) => ({
    visitors: uniq(events, e => e.visitor_id),
    sessions: ss.length,
    pageviews: count(events, 'pageview'),
    productViews: count(events, 'product_view'),
    searches: count(events, 'search'),
    wa: count(events, 'whatsapp_click'),
    conv: ss.length ? convSessions(ss) / ss.length : 0,
    dur: durOf(ss),
    bounce: bounce(ss),
  });
  const cK = K(cur, sessions), pK = K(prev, prevSessions);

  const kpis = [
    { label: 'Visitantes únicos', v: cK.visitors, p: pK.visitors, fmt: n => n.toLocaleString('es-AR') },
    { label: 'Sesiones', v: cK.sessions, p: pK.sessions, fmt: n => n.toLocaleString('es-AR') },
    { label: 'Vistas de producto', v: cK.productViews, p: pK.productViews, fmt: n => n.toLocaleString('es-AR') },
    { label: 'Consultas WhatsApp', v: cK.wa, p: pK.wa, fmt: n => n.toLocaleString('es-AR'), hot: true },
    { label: 'Tasa de conversión', v: cK.conv, p: pK.conv, fmt: pct, isPct: true },
    { label: 'Búsquedas', v: cK.searches, p: pK.searches, fmt: n => n.toLocaleString('es-AR') },
    { label: 'Duración media', v: cK.dur, p: pK.dur, fmt: fmtDur, isPct: false, raw: true },
    { label: 'Rebote', v: cK.bounce, p: pK.bounce, fmt: pct, isPct: true, invert: true },
  ];
  $('stats-kpis').innerHTML = kpis.map(k => {
    let delta = '';
    if (hasPrev) {
      const base = k.p;
      let d = 0, show = false;
      if (base > 0) { d = (k.v - base) / base; show = true; }
      else if (k.v > 0) { d = 1; show = true; }
      if (show) {
        const up = d >= 0;
        const good = k.invert ? !up : up;
        const arrow = up ? '▲' : '▼';
        delta = `<span class="kpi-delta ${good ? 'up' : 'down'}">${arrow} ${Math.abs(d * 100).toFixed(0)}%</span>`;
      } else {
        delta = `<span class="kpi-delta flat">—</span>`;
      }
    }
    return `<div class="kpi${k.hot ? ' kpi-hot' : ''}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-val">${k.fmt(k.v)}</div>
      ${delta}
    </div>`;
  }).join('');

  // ---- Timeline ----
  renderTimeline(cur, ctx);

  // ---- Funnel ----
  const engaged = sessions.filter(s => s.events.some(e => ['product_impression', 'product_view', 'search', 'filter_category', 'filter_subcategory', 'load_more'].includes(e.type))).length;
  const viewed = sessions.filter(s => s.events.some(e => e.type === 'product_view')).length;
  const converted = convSessions(sessions);
  const funnel = [
    { label: 'Sesiones', v: sessions.length },
    { label: 'Exploraron (buscó/filtró/vio)', v: engaged },
    { label: 'Abrieron un producto', v: viewed },
    { label: 'Consultaron por WhatsApp', v: converted },
  ];
  const fTop = funnel[0].v || 1;
  $('stats-funnel').innerHTML = funnel.map((f, i) => {
    const w = Math.max((f.v / fTop) * 100, 1.5);
    const rate = i === 0 ? '' : (funnel[i - 1].v ? ` · ${((f.v / funnel[i - 1].v) * 100).toFixed(0)}% del paso anterior` : '');
    return `<div class="funnel-row">
      <div class="funnel-top"><span>${f.label}</span><strong>${f.v.toLocaleString('es-AR')}</strong></div>
      <div class="funnel-track"><div class="funnel-fill" style="width:0" data-w="${w}"></div></div>
      <div class="funnel-sub">${((f.v / fTop) * 100).toFixed(0)}% del total${rate}</div>
    </div>`;
  }).join('');
  requestAnimationFrame(() => $('stats-funnel').querySelectorAll('.funnel-fill').forEach((el, i) => { el.style.transitionDelay = (i * 60) + 'ms'; el.style.width = el.dataset.w + '%'; }));

  // ---- WhatsApp por producto ----
  const waByProd = groupCount(cur.filter(e => e.type === 'whatsapp_click' && e.product_id), e => e.product_id);
  renderRank('stats-wa-products', topN(waByProd, 8).map(([id, n]) => ({ label: prodName(id), value: n, img: prodImg(id), valTxt: n + (n === 1 ? ' consulta' : ' consultas') })), '#27AE60', 'Nadie consultó por un producto puntual todavía.');

  // ---- Productos más vistos ----
  const viewsByProd = groupCount(cur.filter(e => e.type === 'product_view' && e.product_id), e => e.product_id);
  renderRank('stats-top-products', topN(viewsByProd, 10).map(([id, n]) => ({ label: prodName(id), value: n, img: prodImg(id), valTxt: n + (n === 1 ? ' vista' : ' vistas') })), STC[0], 'Sin vistas de producto en el período.');

  // ---- Nunca vistos ----
  const viewedSet = new Set(Object.keys(viewsByProd).map(Number));
  const never = state.products.filter(p => !viewedSet.has(Number(p.id)));
  $('stats-never').innerHTML = never.length
    ? `<div class="never-count">${never.length} de ${state.products.length} productos sin una sola vista</div>` +
      never.slice(0, 40).map(p => `<div class="mini-row"><img src="${esc(p.img)}" onerror="this.style.visibility='hidden'"><span>${esc(p.name)}</span></div>`).join('') +
      (never.length > 40 ? `<div class="stats-more">+${never.length - 40} más</div>` : '')
    : `<div class="empty">🎉 Todos los productos recibieron al menos una vista.</div>`;

  // ---- CTR (impresiones vs vistas) ----
  const imprByProd = groupCount(cur.filter(e => e.type === 'product_impression' && e.product_id), e => e.product_id);
  const ctrRows = Object.keys(imprByProd).map(id => {
    const impr = imprByProd[id], v = viewsByProd[id] || 0;
    return { id: Number(id), impr, v, ctr: impr ? v / impr : 0 };
  }).filter(r => r.impr >= 2).sort((a, b) => b.impr - a.impr).slice(0, 14);
  $('stats-ctr').innerHTML = ctrRows.length
    ? ctrRows.map(r => {
        const w = Math.max(r.ctr * 100, 1);
        return `<div class="rank-row">
          <img src="${esc(prodImg(r.id))}" onerror="this.style.visibility='hidden'">
          <div class="rank-main">
            <div class="rank-label">${esc(prodName(r.id))}</div>
            <div class="rank-track"><div class="rank-fill" style="width:0;background:#2E86DE" data-w="${w}"></div></div>
          </div>
          <div class="rank-val">${(r.ctr * 100).toFixed(0)}%<span class="rank-val-sub">${r.v}/${r.impr}</span></div>
        </div>`;
      }).join('')
    : '<div class="empty">Faltan impresiones para calcular efectividad. Se acumulan a medida que los visitantes ven el catálogo.</div>';
  animateFills('stats-ctr');

  // ---- Búsquedas ----
  const searchEvents = cur.filter(e => e.type === 'search' && e.query);
  const byQuery = new Map();
  for (const e of searchEvents) {
    const q = e.query.trim().toLowerCase();
    if (!q) continue;
    let o = byQuery.get(q);
    if (!o) { o = { q: e.query.trim(), n: 0, minResults: Infinity }; byQuery.set(q, o); }
    o.n++;
    const r = e.meta && e.meta.results != null ? Number(e.meta.results) : null;
    if (r != null && r < o.minResults) o.minResults = r;
  }
  const queries = [...byQuery.values()].sort((a, b) => b.n - a.n);
  renderRank('stats-searches', queries.slice(0, 12).map(o => ({ label: '“' + o.q + '”', value: o.n, valTxt: o.n + (o.n === 1 ? ' vez' : ' veces') })), '#8E44AD', 'Nadie usó el buscador todavía.');
  const empties = queries.filter(o => o.minResults === 0);
  $('stats-searches-empty').innerHTML = empties.length
    ? empties.slice(0, 12).map(o => `<div class="mini-row warn"><span>“${esc(o.q)}”</span><b>${o.n}×</b></div>`).join('')
    : '<div class="empty">Todas las búsquedas tuvieron resultados 👌</div>';

  // ---- Doughnuts: categorías, fuentes, dispositivos, nuevos/recurrentes ----
  const catFilters = groupCount(cur.filter(e => e.type === 'filter_category' && e.meta && e.meta.cat && e.meta.cat !== 'all'), e => e.meta.cat);
  doughnut('chart-cats', topN(catFilters, 8).map(([k, n]) => [catLabel(k), n]));

  const srcBySession = groupCount(sessions.filter(s => s.meta.source), s => s.meta.source);
  doughnut('chart-sources', topN(srcBySession, 8));

  const devBySession = groupCount(sessions.filter(s => s.meta.device), s => s.meta.device);
  doughnut('chart-devices', Object.entries(devBySession).map(([k, n]) => [({ mobile: 'Celular', desktop: 'Computadora', tablet: 'Tablet' }[k] || k), n]));

  let nuevos = 0, recurrentes = 0;
  sessions.forEach(s => { if (s.meta.new_visitor === true) nuevos++; else if (s.meta.new_visitor === false) recurrentes++; });
  doughnut('chart-newret', [['Nuevos', nuevos], ['Recurrentes', recurrentes]], ['#F47B20', '#0f0f0f']);

  // ---- Navegadores / SO ----
  const brBySession = groupCount(sessions.filter(s => s.meta.browser), s => s.meta.browser);
  renderRank('stats-browsers', topN(brBySession, 6).map(([k, n]) => ({ label: k, value: n, valTxt: n + '' })), STC[2], 'Sin datos aún.');
  const osBySession = groupCount(sessions.filter(s => s.meta.os), s => s.meta.os);
  renderRank('stats-os', topN(osBySession, 6).map(([k, n]) => ({ label: k, value: n, valTxt: n + '' })), STC[3], 'Sin datos aún.');

  // ---- Heatmap hora x día ----
  renderHoursHeat(sessions);

  // ---- Páginas ----
  const pages = groupCount(cur.filter(e => e.type === 'pageview'), e => e.path || '—');
  renderRank('stats-pages', topN(pages, 8).map(([k, n]) => ({ label: k === 'inicio' ? 'Inicio' : k, value: n, valTxt: n + (n === 1 ? ' vista' : ' vistas') })), STC[9], 'Sin vistas.');

  // ---- Enganche ----
  const pageTimes = cur.filter(e => e.type === 'page_time' && e.meta);
  const avgSecs = pageTimes.length ? pageTimes.reduce((a, e) => a + (Number(e.meta.seconds) || 0), 0) / pageTimes.length : 0;
  const scrolls = pageTimes.filter(e => e.meta.scroll != null);
  const avgScroll = scrolls.length ? scrolls.reduce((a, e) => a + Number(e.meta.scroll), 0) / scrolls.length : 0;
  const ppS = sessions.length ? cK.pageviews / sessions.length : 0;
  $('stats-engagement').innerHTML = [
    { label: 'Duración media de sesión', v: fmtDur(cK.dur) },
    { label: 'Páginas por sesión', v: ppS.toFixed(1) },
    { label: 'Tiempo medio en página', v: fmtDur(avgSecs) },
    { label: 'Scroll promedio', v: avgScroll.toFixed(0) + '%' },
  ].map(r => `<div class="eng-row"><span>${r.label}</span><strong>${r.v}</strong></div>`).join('');

  // ---- Geografía ----
  renderGeo(sessions);

  // ---- Explorador de recorridos ----
  renderSessionExplorer(sessions);
}

function renderGeo(sessions) {
  const geoS = sessions.filter(s => s.meta && (s.meta.cc || s.meta.country || s.meta.ip));

  // Países (con bandera)
  const byCountry = {};
  geoS.forEach(s => { const k = s.meta.country || s.meta.cc; if (!k) return; (byCountry[k] = byCountry[k] || { n: 0, cc: s.meta.cc }).n++; });
  renderRank('stats-countries',
    Object.entries(byCountry).sort((a, b) => b[1].n - a[1].n).slice(0, 10).map(([name, o]) => ({ label: flag(o.cc) + '  ' + name, value: o.n, valTxt: o.n + (o.n === 1 ? ' visita' : ' visitas') })),
    STC[0], 'Todavía no hay datos de ubicación. Se cargan con cada visita nueva.');

  // Provincias / regiones
  const byRegion = groupCount(geoS.filter(s => s.meta.region), s => s.meta.region);
  renderRank('stats-regions', topN(byRegion, 12).map(([k, n]) => ({ label: k, value: n, valTxt: n + '' })), STC[2], 'Sin datos de provincia aún.');

  // Ciudades
  const byCity = groupCount(geoS.filter(s => s.meta.city), s => s.meta.city);
  renderRank('stats-cities', topN(byCity, 12).map(([k, n]) => ({ label: k, value: n, valTxt: n + '' })), STC[3], 'Sin datos de ciudad aún.');

  // Operadores / ISP
  const byIsp = groupCount(geoS.filter(s => s.meta.isp), s => s.meta.isp);
  renderRank('stats-isp', topN(byIsp, 10).map(([k, n]) => ({ label: k, value: n, valTxt: n + '' })), STC[4], 'Sin datos de operador aún.');

  // Direcciones IP (tabla): visitas por IP, ubicación y última vez
  const ipMap = new Map();
  geoS.filter(s => s.meta.ip).forEach(s => {
    let o = ipMap.get(s.meta.ip);
    if (!o) { o = { ip: s.meta.ip, n: 0, last: s.start, cc: s.meta.cc, city: s.meta.city, country: s.meta.country, isp: s.meta.isp }; ipMap.set(s.meta.ip, o); }
    o.n++;
    if (s.start > o.last) o.last = s.start;
  });
  const ips = [...ipMap.values()].sort((a, b) => b.n - a.n).slice(0, 25);
  $('stats-ips').innerHTML = ips.length
    ? `<table class="ip-table"><thead><tr><th>IP</th><th>Ubicación</th><th>Operador</th><th class="ip-num">Visitas</th><th>Última</th></tr></thead><tbody>` +
      ips.map(o => `<tr>
        <td class="ip-addr">${esc(o.ip)}</td>
        <td>${flag(o.cc)} ${esc([o.city, o.country].filter(Boolean).join(', ') || '—')}</td>
        <td class="ip-isp">${esc(o.isp || '—')}</td>
        <td class="ip-num">${o.n}</td>
        <td class="ip-when">${esc(relativeTime(o.last))}</td>
      </tr>`).join('') + '</tbody></table>'
    : '<div class="empty">Todavía no se registraron IPs. Aparecen con cada visita nueva.</div>';
}

/* --- helpers de agregación / render --- */
function groupCount(arr, keyFn) { const o = {}; for (const x of arr) { const k = keyFn(x); if (k == null) continue; o[k] = (o[k] || 0) + 1; } return o; }
function topN(obj, n) { return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n); }

function renderRank(id, items, color, emptyMsg) {
  const el = $(id);
  if (!items.length) { el.innerHTML = `<div class="empty">${emptyMsg || 'Sin datos.'}</div>`; return; }
  const max = Math.max(...items.map(i => i.value), 1);
  el.innerHTML = items.map(it => {
    const w = Math.max((it.value / max) * 100, 2);
    return `<div class="rank-row">
      ${it.img != null ? `<img src="${esc(it.img)}" onerror="this.style.visibility='hidden'">` : ''}
      <div class="rank-main">
        <div class="rank-label">${esc(it.label)}</div>
        <div class="rank-track"><div class="rank-fill" style="width:0;background:${color}" data-w="${w}"></div></div>
      </div>
      <div class="rank-val">${esc(it.valTxt != null ? it.valTxt : it.value)}</div>
    </div>`;
  }).join('');
  animateFills(id);
}
function animateFills(id) {
  requestAnimationFrame(() => $(id).querySelectorAll('.rank-fill').forEach((el, i) => { el.style.transitionDelay = (i * 30) + 'ms'; el.style.width = el.dataset.w + '%'; }));
}

function doughnut(canvasId, entries, colors) {
  const cv = $(canvasId); if (!cv || !window.Chart) return;
  if (statsCharts[canvasId]) statsCharts[canvasId].destroy();
  if (!entries.length) { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); cv.parentElement.classList.add('is-empty'); return; }
  cv.parentElement.classList.remove('is-empty');
  statsCharts[canvasId] = new Chart(cv, {
    type: 'doughnut',
    data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1]), backgroundColor: colors || STC, borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, padding: 10 } } } },
  });
}

function renderTimeline(cur, ctx) {
  const cv = $('chart-timeline'); if (!cv || !window.Chart) return;
  if (statsCharts.timeline) statsCharts.timeline.destroy();

  const now = ctx.now, startMs = ctx.curStartMs;
  const spanMs = now - startMs;
  let mode = 'day';
  if (_statsDays === 1) mode = 'hour';
  else if (spanMs > 130 * DAY_MS) mode = 'week';

  let buckets = [], labels = [];
  const idxOf = (t) => {
    if (mode === 'hour') { const d = new Date(t); return d.getHours(); }
    if (mode === 'week') return Math.floor((t - startMs) / (7 * DAY_MS));
    return Math.floor((t - startMs) / DAY_MS);
  };
  let nBuckets;
  if (mode === 'hour') nBuckets = 24;
  else if (mode === 'week') nBuckets = Math.max(1, Math.floor(spanMs / (7 * DAY_MS)) + 1);
  else nBuckets = Math.max(1, Math.floor(spanMs / DAY_MS) + 1);
  nBuckets = Math.min(nBuckets, 400);

  for (let i = 0; i < nBuckets; i++) {
    if (mode === 'hour') labels.push(i + 'h');
    else {
      const d = new Date(startMs + i * (mode === 'week' ? 7 : 1) * DAY_MS);
      labels.push(d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }));
    }
  }
  const ses = new Array(nBuckets).fill(0), pv = new Array(nBuckets).fill(0), wa = new Array(nBuckets).fill(0);
  for (const e of cur) {
    const i = idxOf(new Date(e.created_at).getTime());
    if (i < 0 || i >= nBuckets) continue;
    if (e.type === 'session_start') ses[i]++;
    else if (e.type === 'product_view') pv[i]++;
    else if (e.type === 'whatsapp_click') wa[i]++;
  }

  const mk = (label, data, color) => ({ label, data, borderColor: color, backgroundColor: color + '22', fill: true, tension: 0.35, borderWidth: 2, pointRadius: nBuckets > 45 ? 0 : 3, pointHoverRadius: 5 });
  statsCharts.timeline = new Chart(cv, {
    type: 'line',
    data: { labels, datasets: [ mk('Sesiones', ses, '#F47B20'), mk('Vistas de producto', pv, '#2E86DE'), mk('Consultas WhatsApp', wa, '#27AE60') ] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eee' } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 10 } } } } },
  });
}

function renderHoursHeat(sessions) {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  sessions.forEach(s => { const d = new Date(s.start); const day = (d.getDay() + 6) % 7; grid[day][d.getHours()]++; });
  const max = Math.max(1, ...grid.flat());
  const hourTicks = [0, 3, 6, 9, 12, 15, 18, 21];
  let html = '<div class="heat-grid">';
  html += '<div class="heat-corner"></div>';
  for (let h = 0; h < 24; h++) html += `<div class="heat-htick">${hourTicks.includes(h) ? h + 'h' : ''}</div>`;
  for (let d = 0; d < 7; d++) {
    html += `<div class="heat-dlabel">${days[d]}</div>`;
    for (let h = 0; h < 24; h++) {
      const v = grid[d][h];
      const op = v ? (0.14 + (v / max) * 0.86).toFixed(2) : 0;
      html += `<div class="heat-cell" title="${days[d]} ${h}:00 — ${v} sesion${v === 1 ? '' : 'es'}" style="background:${v ? `rgba(244,123,32,${op})` : '#f0f0f0'}"></div>`;
    }
  }
  html += '</div>';
  $('stats-hours').innerHTML = sessions.length ? html : '<div class="empty">Sin sesiones en el período.</div>';
}

function renderSessionExplorer(sessions) {
  const el = $('stats-sessions');
  const sorted = [...sessions].sort((a, b) => new Date(b.start) - new Date(a.start)).slice(0, 50);
  if (!sorted.length) { el.innerHTML = '<div class="empty">Sin sesiones en el período.</div>'; return; }
  el.innerHTML = sorted.map((s, i) => {
    const dur = (new Date(s.end) - new Date(s.start)) / 1000;
    const converted = s.events.some(e => e.type === 'whatsapp_click');
    const nViews = s.events.filter(e => e.type === 'product_view').length;
    const dev = DEVICE_ICON[s.meta.device] || '🌐';
    const src = s.meta.source || '—';
    const actions = s.events.filter(e => e.type !== 'geo' && e.type !== 'session_start');
    const nEv = actions.length;
    const m = s.meta || {};
    const place = [m.city, m.region, m.country].filter(Boolean).join(', ');
    const geoTxt = (m.cc || place) ? `${flag(m.cc)} ${esc(place || m.country || '')}` : '';
    const techBits = [
      m.browser, m.os,
      m.cores ? m.cores + ' núcleos' : null,
      m.memory ? m.memory + ' GB RAM' : null,
      m.conn ? m.conn.toUpperCase() : null,
      m.screen, m.isp,
      m.ip ? 'IP ' + m.ip : null,
    ].filter(Boolean).map(esc).join(' · ');
    return `<div class="sess">
      <button class="sess-head" onclick="toggleSession(this)">
        <span class="sess-caret">▸</span>
        <span class="sess-dev">${dev}</span>
        <span class="sess-when">${relativeTime(s.start)}</span>
        ${geoTxt ? `<span class="sess-geo">${geoTxt}</span>` : ''}
        <span class="sess-src">${esc(src)}</span>
        <span class="sess-metrics">${nEv} acciones · ${fmtDur(dur)}${nViews ? ` · ${nViews} prod.` : ''}</span>
        ${converted ? '<span class="sess-conv">💬 Consultó</span>' : ''}
      </button>
      <div class="sess-timeline" style="display:none">
        ${techBits ? `<div class="sess-detail">${techBits}</div>` : ''}
        ${actions.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(e => {
          const [lab, ic] = EV_LABEL[e.type] || [e.type, '•'];
          let detail = '';
          if (e.type === 'product_view' || e.type === 'product_impression' || e.type === 'whatsapp_click') { if (e.product_id) detail = prodName(e.product_id); }
          else if (e.type === 'search') detail = '“' + (e.query || '') + '”' + (e.meta && e.meta.results != null ? ` (${e.meta.results} result.)` : '');
          else if (e.type === 'filter_category') detail = catLabel(e.meta && e.meta.cat);
          else if (e.type === 'filter_subcategory') detail = subLabel(e.meta && e.meta.subcat);
          else if (e.type === 'outbound_click') detail = e.meta && e.meta.to || '';
          else if (e.type === 'page_time') detail = `${e.meta.seconds || 0}s · scroll ${e.meta.scroll || 0}%`;
          else if (e.type === 'pageview') detail = e.path === 'inicio' ? 'Inicio' : (e.path || '');
          const time = new Date(e.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return `<div class="tl-item"><span class="tl-ic">${ic}</span><span class="tl-lab">${lab}${detail ? ` <b>${esc(detail)}</b>` : ''}</span><span class="tl-time">${time}</span></div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}
function toggleSession(btn) {
  const tl = btn.nextElementSibling;
  const open = tl.style.display !== 'none';
  tl.style.display = open ? 'none' : 'block';
  btn.querySelector('.sess-caret').textContent = open ? '▸' : '▾';
  btn.classList.toggle('open', !open);
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  $('login-form').addEventListener('submit', doLogin);
  $('logout-btn').addEventListener('click', doLogout);

  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $('tab-' + t.dataset.tab).classList.add('active');
    if (t.dataset.tab === 'destacados') renderFeatured();
    if (t.dataset.tab === 'catalogo')   renderCatalogPicker();
    if (t.dataset.tab === 'orden')      renderOrder();
    if (t.dataset.tab === 'estadisticas') renderStats();
    if (t.dataset.tab === 'actividad')  renderHeatmap();
    if (t.dataset.tab === 'banner')     renderBannerTab();
  }));

  // Estadísticas: rango de tiempo + refrescar
  if (window.Chart) {
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.color = '#555';
  }
  document.querySelectorAll('#stats-range .heat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#stats-range .heat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      _statsDays = pill.dataset.days ? parseInt(pill.dataset.days) : null;
      renderStats();
    });
  });
  $('stats-refresh')?.addEventListener('click', renderStats);

  $('product-search').addEventListener('input', e => { state.psearch = e.target.value; renderProducts(); });
  $('product-sort')?.addEventListener('change', e => { state.psort = e.target.value; renderProducts(); });
  $('cat-search')?.addEventListener('input', e => { state.catsearch = e.target.value; renderCats(); });
  $('subcat-search')?.addEventListener('input', e => { state.scsearch = e.target.value; renderSubcats(); });
  $('subcat-cat-filter')?.addEventListener('change', e => { state.sccat = e.target.value; renderSubcats(); });
  $('featured-search')?.addEventListener('input', renderFeatured);
  $('save-featured-btn')?.addEventListener('click', saveFeatured);
  $('catalog-search')?.addEventListener('input', renderCatalogPicker);
  $('save-catalog-btn')?.addEventListener('click', saveCatalogPins);
  $('order-context')?.addEventListener('change', e => { state.orderCtx = e.target.value; renderOrder(); });
  $('order-search')?.addEventListener('input', e => { state.ordersearch = e.target.value; renderOrder(); });
  $('save-order-btn')?.addEventListener('click', saveOrder);
  initOrderDnD();
  document.querySelectorAll('.heat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.heat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      _heatDays = pill.dataset.days ? parseInt(pill.dataset.days) : null;
      renderHeatmap();
    });
  });
  $('banner-text')?.addEventListener('input', updateBannerPreview);
  $('save-banner-btn')?.addEventListener('click', saveBanner);
  $('new-product-btn').addEventListener('click', newProduct);
  $('import-products-btn').addEventListener('click', importProducts);
  $('new-cat-btn').addEventListener('click', newCat);
  $('new-subcat-btn').addEventListener('click', newSubcat);

  $('modal-x').addEventListener('click', closeModal);
  $('modal-cancel').addEventListener('click', closeModal);
  $('modal-save').addEventListener('click', () => saveHandler && saveHandler());
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
});
