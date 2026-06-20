/* ===== EBTOOLS — BACKOFFICE LOGIC ===== */
const CFG = window.EBTOOLS_CONFIG || {};
const CONFIGURED = CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes('__SUPABASE_URL__') &&
  CFG.SUPABASE_ANON_KEY && !CFG.SUPABASE_ANON_KEY.includes('__SUPABASE_ANON_KEY__');

let sb = null;
const state = { cats: [], subcats: [], products: [], psearch: '' };

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

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
  renderProducts();
  renderCats();
  renderSubcats();
}

const catLabel = k => state.cats.find(c => c.key === k)?.label || k;
const subLabel = k => state.subcats.find(s => s.key === k)?.label || (k || '—');

/* ---------- RENDER: PRODUCTS ---------- */
function renderProducts() {
  const wrap = $('products-table');
  const q = state.psearch.toLowerCase();
  const list = state.products.filter(p => !q || p.name.toLowerCase().includes(q) || catLabel(p.cat).toLowerCase().includes(q));
  if (!list.length) { wrap.innerHTML = '<div class="empty">Sin productos.</div>'; return; }
  wrap.innerHTML = list.map(p => `
    <div class="row">
      <img src="${esc(p.img)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="row-main">
        <div class="row-title">${esc(p.name)}</div>
        <div class="row-meta">
          <span class="tag">${esc(catLabel(p.cat))}</span>
          ${p.subcat ? `<span class="tag">${esc(subLabel(p.subcat))}</span>` : ''}
          ${p.active ? '' : '<span class="tag off">Oculto</span>'}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" onclick="editProduct(${p.id})">Editar</button>
        <button class="icon-btn danger" onclick="delProduct(${p.id})">Borrar</button>
      </div>
    </div>`).join('');
}

/* ---------- RENDER: CATEGORIES ---------- */
function renderCats() {
  const wrap = $('cats-table');
  if (!state.cats.length) { wrap.innerHTML = '<div class="empty">Sin categorías.</div>'; return; }
  wrap.innerHTML = state.cats.map(c => {
    const n = state.products.filter(p => p.cat === c.key).length;
    return `
    <div class="row">
      <div class="row-main">
        <div class="row-title">${esc(c.label)}</div>
        <div class="row-meta"><span class="tag">${esc(c.key)}</span> ${n} productos</div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" onclick="editCat('${esc(c.key)}')">Editar</button>
        <button class="icon-btn danger" onclick="delCat('${esc(c.key)}')">Borrar</button>
      </div>
    </div>`;
  }).join('');
}

/* ---------- RENDER: SUBCATEGORIES ---------- */
function renderSubcats() {
  const wrap = $('subcats-table');
  if (!state.subcats.length) { wrap.innerHTML = '<div class="empty">Sin subcategorías.</div>'; return; }
  wrap.innerHTML = state.subcats.map(s => {
    const n = state.products.filter(p => p.subcat === s.key).length;
    return `
    <div class="row">
      <div class="row-main">
        <div class="row-title">${esc(s.label)}</div>
        <div class="row-meta"><span class="tag">${esc(catLabel(s.cat))}</span> ${n} productos</div>
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
const formVal = name => $('modal-form').elements[name]?.value ?? '';

/* ---------- PRODUCT CRUD ---------- */
function catOptions() { return state.cats.map(c => ({ value: c.key, label: c.label })); }
function subOptions(cat) {
  return [{ value:'', label:'— Sin subcategoría —' }, ...state.subcats.filter(s => s.cat === cat).map(s => ({ value: s.key, label: s.label }))];
}

function productForm(p) {
  const cat = p?.cat || state.cats[0]?.key || '';
  return `
    ${fieldText('name','Nombre', p?.name || '')}
    ${fieldText('slug','Slug (URL)', p?.slug || '')}
    ${fieldSelect('cat','Categoría', catOptions(), cat)}
    ${fieldSelect('subcat','Subcategoría', subOptions(cat), p?.subcat || '')}
    ${fieldText('img','URL de imagen', p?.img || '')}
    ${fieldText('short','Descripción corta', p?.short || '')}
    ${fieldArea('descr','Descripción completa', p?.descr || '')}
    <label class="check-row"><input type="checkbox" name="active" ${(!p || p.active) ? 'checked' : ''}> <span>Visible en el sitio</span></label>`;
}

function bindCatChangeForSubcat() {
  const catSel = $('modal-form').elements['cat'];
  const subSel = $('modal-form').elements['subcat'];
  if (!catSel || !subSel) return;
  catSel.addEventListener('change', () => {
    const opts = subOptions(catSel.value);
    subSel.innerHTML = opts.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
  });
}

function newProduct() {
  openModal('Nuevo producto', productForm(null), async () => {
    const payload = collectProduct();
    if (!payload) return;
    const { error } = await sb.from('products').insert(payload);
    afterSave(error, 'Producto creado');
  });
  bindCatChangeForSubcat();
}
function editProduct(id) {
  const p = state.products.find(x => x.id === id);
  openModal('Editar producto', productForm(p), async () => {
    const payload = collectProduct();
    if (!payload) return;
    const { error } = await sb.from('products').update(payload).eq('id', id);
    afterSave(error, 'Producto actualizado');
  });
  bindCatChangeForSubcat();
}
function collectProduct() {
  const name = formVal('name').trim();
  if (!name) { $('modal-msg').textContent = 'El nombre es obligatorio.'; return null; }
  const slug = formVal('slug').trim() || name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return {
    name, slug,
    cat: formVal('cat'),
    subcat: formVal('subcat') || null,
    img: formVal('img').trim(),
    short: formVal('short').trim(),
    descr: formVal('descr').trim(),
    active: $('modal-form').elements['active'].checked,
  };
}
async function delProduct(id) {
  const p = state.products.find(x => x.id === id);
  if (!confirm(`¿Borrar "${p?.name}"? Esta acción no se puede deshacer.`)) return;
  const { error } = await sb.from('products').delete().eq('id', id);
  afterSave(error, 'Producto borrado');
}

/* ---------- CATEGORY CRUD ---------- */
function catForm(c, isNew) {
  return `
    ${fieldText('key','Clave (key, sin espacios)', c?.key || '')}${isNew ? '' : '<div class="row-meta" style="margin-top:-6px">La clave no se puede cambiar.</div>'}
    ${fieldText('label','Nombre visible', c?.label || '')}
    ${fieldArea('icon','Ícono SVG (opcional)', c?.icon || '')}
    ${fieldText('sort','Orden', c?.sort ?? state.cats.length + 1, 'number')}`;
}
function newCat() {
  openModal('Nueva categoría', catForm(null, true), async () => {
    const key = formVal('key').trim().toLowerCase().replace(/[^a-z0-9-]/g,'');
    if (!key || !formVal('label').trim()) { $('modal-msg').textContent = 'Clave y nombre son obligatorios.'; return; }
    const { error } = await sb.from('categories').insert({ key, label: formVal('label').trim(), icon: formVal('icon').trim(), sort: parseInt(formVal('sort'))||0 });
    afterSave(error, 'Categoría creada');
  });
  setTimeout(() => { const k=$('modal-form').elements['key']; if(k) k.disabled=false; }, 0);
}
function editCat(key) {
  const c = state.cats.find(x => x.key === key);
  openModal('Editar categoría', catForm(c, false), async () => {
    const { error } = await sb.from('categories').update({ label: formVal('label').trim(), icon: formVal('icon').trim(), sort: parseInt(formVal('sort'))||0 }).eq('key', key);
    afterSave(error, 'Categoría actualizada');
  });
  const k = $('modal-form').elements['key']; if (k) k.disabled = true;
}
async function delCat(key) {
  const n = state.products.filter(p => p.cat === key).length;
  if (n > 0) { alert(`No se puede borrar: tiene ${n} productos. Reasignalos primero.`); return; }
  if (!confirm('¿Borrar esta categoría?')) return;
  const { error } = await sb.from('categories').delete().eq('key', key);
  afterSave(error, 'Categoría borrada');
}

/* ---------- SUBCATEGORY CRUD ---------- */
function subcatForm(s, isNew) {
  return `
    ${fieldText('key','Clave (key, sin espacios)', s?.key || '')}${isNew ? '' : '<div class="row-meta" style="margin-top:-6px">La clave no se puede cambiar.</div>'}
    ${fieldSelect('cat','Categoría padre', catOptions(), s?.cat || state.cats[0]?.key || '')}
    ${fieldText('label','Nombre visible', s?.label || '')}
    ${fieldText('sort','Orden', s?.sort ?? state.subcats.length + 1, 'number')}`;
}
function newSubcat() {
  openModal('Nueva subcategoría', subcatForm(null, true), async () => {
    const key = formVal('key').trim().toLowerCase().replace(/[^a-z0-9-]/g,'');
    if (!key || !formVal('label').trim()) { $('modal-msg').textContent = 'Clave y nombre son obligatorios.'; return; }
    const { error } = await sb.from('subcategories').insert({ key, cat: formVal('cat'), label: formVal('label').trim(), sort: parseInt(formVal('sort'))||0 });
    afterSave(error, 'Subcategoría creada');
  });
}
function editSubcat(key) {
  const s = state.subcats.find(x => x.key === key);
  openModal('Editar subcategoría', subcatForm(s, false), async () => {
    const { error } = await sb.from('subcategories').update({ cat: formVal('cat'), label: formVal('label').trim(), sort: parseInt(formVal('sort'))||0 }).eq('key', key);
    afterSave(error, 'Subcategoría actualizada');
  });
  const k = $('modal-form').elements['key']; if (k) k.disabled = true;
}
async function delSubcat(key) {
  const n = state.products.filter(p => p.subcat === key).length;
  if (n > 0 && !confirm(`Tiene ${n} productos asignados (quedarán sin subcategoría). ¿Continuar?`)) return;
  if (n === 0 && !confirm('¿Borrar esta subcategoría?')) return;
  const { error } = await sb.from('subcategories').delete().eq('key', key);
  afterSave(error, 'Subcategoría borrada');
}

/* ---------- SAVE HELPER ---------- */
async function afterSave(error, okMsg) {
  if (error) { $('modal-msg').textContent = 'Error: ' + error.message; toast('Error al guardar', true); return; }
  closeModal();
  toast(okMsg);
  await loadAll();
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
  }));

  $('product-search').addEventListener('input', e => { state.psearch = e.target.value; renderProducts(); });
  $('new-product-btn').addEventListener('click', newProduct);
  $('new-cat-btn').addEventListener('click', newCat);
  $('new-subcat-btn').addEventListener('click', newSubcat);

  $('modal-x').addEventListener('click', closeModal);
  $('modal-cancel').addEventListener('click', closeModal);
  $('modal-save').addEventListener('click', () => saveHandler && saveHandler());
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
});
