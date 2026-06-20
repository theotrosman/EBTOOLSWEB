/* ===== EBTOOLS — BACKOFFICE LOGIC ===== */
const CFG = window.EBTOOLS_CONFIG || {};
const CONFIGURED = CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes('__SUPABASE_URL__') &&
  CFG.SUPABASE_ANON_KEY && !CFG.SUPABASE_ANON_KEY.includes('__SUPABASE_ANON_KEY__');

let sb = null;
const state = { cats: [], subcats: [], products: [], psearch: '' };

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

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
  const list = state.products.filter(p => !q || p.name.toLowerCase().includes(q) || pcats(p).map(catLabel).join(' ').toLowerCase().includes(q));
  if (!list.length) { wrap.innerHTML = '<div class="empty">Sin productos.</div>'; return; }
  wrap.innerHTML = list.map(p => `
    <div class="row">
      <img src="${esc(p.img)}" alt="" onerror="this.style.visibility='hidden'">
      <div class="row-main">
        <div class="row-title">${esc(p.name)}</div>
        <div class="row-meta">
          ${pcats(p).map(c => `<span class="tag">${esc(catLabel(c))}</span>`).join('')}
          ${psubs(p).map(s => `<span class="tag tag-sub">${esc(subLabel(s))}</span>`).join('')}
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
    const n = state.products.filter(p => pcats(p).includes(c.key)).length;
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
    const n = state.products.filter(p => psubs(p).includes(s.key)).length;
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

function productForm(p) {
  const selCats = p ? pcats(p) : (state.cats[0] ? [state.cats[0].key] : []);
  const selSubs = p ? psubs(p) : [];
  return `
    <div class="field"><span>Vista previa</span><div class="prod-preview" id="prod-preview"></div></div>
    ${fieldText('name','Nombre', p?.name || '')}
    ${fieldText('slug','Slug (URL)', p?.slug || '')}
    ${fieldChecks('cats','Categorías', catOptions(), selCats, 'Podés elegir más de una.')}
    ${fieldChecks('subcats','Subcategorías', subCheckOptions(), selSubs, 'Se muestran las de las categorías elegidas.')}
    ${imageField(p?.img || '')}
    ${fieldText('short','Descripción corta', p?.short || '')}
    ${fieldArea('descr','Descripción completa', p?.descr || '')}
    <label class="check-row"><input type="checkbox" name="active" ${(!p || p.active) ? 'checked' : ''}> <span>Visible en el sitio</span></label>`;
}

// Campo de imagen: zona para arrastrar/soltar (o clic) + URL manual de respaldo.
function imageField(val) {
  return `<div class="field"><span>Imagen</span>
    <div class="check-hint">Arrastrá un archivo, hacé clic para elegirlo, o pegá una URL abajo.</div>
    <div class="dropzone" id="img-drop" tabindex="0" role="button" aria-label="Subir imagen">
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
    cb.addEventListener('change', () => { syncSubcatVisibility(); updatePreview(); }));
  ['name', 'img', 'short'].forEach(n => {
    const el = form.elements[n];
    if (el) el.addEventListener('input', updatePreview);
  });
  bindDropzone();
  syncSubcatVisibility();
  updatePreview();
}

// Vista previa en vivo de cómo se verá la tarjeta del producto en el sitio.
function updatePreview() {
  const el = $('prod-preview');
  if (!el) return;
  const name  = (formVal('name')  || '').trim() || 'Nombre del producto';
  const img   = (formVal('img')   || '').trim();
  const short = (formVal('short') || '').trim();
  const cats  = checkedVals('cats').map(catLabel);
  el.innerHTML = `
    <div class="pp-card">
      <div class="pp-media">
        ${img ? `<img src="${esc(img)}" alt="" onerror="this.style.display='none'">` : '<span class="pp-noimg">Sin imagen</span>'}
        <div class="pp-tags">${cats.map(c => `<span class="pp-tag">${esc(c)}</span>`).join('')}</div>
      </div>
      <div class="pp-body">
        <div class="pp-name">${esc(name)}</div>
        ${short ? `<div class="pp-short">${esc(short)}</div>` : ''}
        <div class="pp-cta">Consultar por WhatsApp</div>
      </div>
    </div>`;
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
    updatePreview();
    toast('Imagen subida');
  }
}

async function uploadImage(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const id  = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
  const path = `products/${id}.${ext}`;
  const { error } = await sb.storage.from(IMG_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) { toast('Error al subir: ' + error.message, true); return null; }
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
  const slug = formVal('slug').trim() || name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return {
    name, slug,
    cats, subcats,
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
    `<div class="check-hint">Pegá un <b>array JSON</b>. Obligatorios: <b>name</b> y <b>cats</b>. Opcionales: <code>subcats, img, short, descr, slug, active</code>.</div>
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
  const n = state.products.filter(p => pcats(p).includes(key)).length;
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
  const n = state.products.filter(p => psubs(p).includes(key)).length;
  if (n > 0 && !confirm(`Tiene ${n} productos asignados (se les quitará esta subcategoría). ¿Continuar?`)) return;
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
  $('import-products-btn').addEventListener('click', importProducts);
  $('new-cat-btn').addEventListener('click', newCat);
  $('new-subcat-btn').addEventListener('click', newSubcat);

  $('modal-x').addEventListener('click', closeModal);
  $('modal-cancel').addEventListener('click', closeModal);
  $('modal-save').addEventListener('click', () => saveHandler && saveHandler());
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
});
