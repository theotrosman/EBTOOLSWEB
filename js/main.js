/* ===== EBTOOLS — MAIN JS (GSAP) ===== */
/* global gsap, ScrollTrigger, TextPlugin  */

gsap.registerPlugin(ScrollTrigger, TextPlugin);

/* ─── BADGE COLOR MAP ─── */
const BADGE_COLORS = {
  green: '#22c55e', red: '#ef4444', yellow: '#f59e0b',
  orange: '#f47b20', blue: '#3b82f6', black: '#0f0f0f',
};

/* ─── ROTATING ACCENT WORDS ─── */
const ACCENT_WORDS = ['impulsan','transforman','aceleran','equipan','potencian'];
let accentIdx = 0;

/* ─── NAVBAR ─── */
function initNavbar() {
  const navbar  = document.querySelector('.navbar');
  const toggle  = document.getElementById('nav-toggle');
  const menu    = document.getElementById('nav-menu');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });

  toggle?.addEventListener('click', () => {
    menu.classList.toggle('open');
  });
  document.querySelectorAll('.nav-menu a').forEach(a => {
    a.addEventListener('click', () => menu.classList.remove('open'));
  });
}

/* ─── TICKER MARQUEE (GSAP) ─── */
function initTicker() {
  const track = document.querySelector('.ticker-track');
  if (!track || track.dataset.marquee) return;
  track.dataset.marquee = '1';

  // Duplicamos los items DENTRO de la misma fila para que el loop sea continuo
  // (clonar la fila como elemento aparte la apilaba debajo y descentraba el texto).
  track.innerHTML += track.innerHTML;

  const run = () => {
    gsap.killTweensOf(track);
    const half = track.scrollWidth / 2; // ancho de una sola copia
    gsap.set(track, { x: 0 });
    gsap.to(track, { x: -half, duration: 28, ease: 'none', repeat: -1 });
  };

  run();
  // Recalculamos cuando termina de cargar la tipografía (cambia el ancho real).
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
}

/* ─── HERO ENTRANCE ─── */
const HERO_ELS = [
  '.hero-eyebrow', '.hero-title', '.hero-sub',
  '.hero-btns', '.hero-btns > *', '.hero-trust',
  '.hero-product-card', '.hero-chip', '.hero-dots'
];

function forceHeroVisible() {
  gsap.set(HERO_ELS, { clearProps: 'all' });
}

function heroEntrance() {
  const tl = gsap.timeline({
    defaults: { ease: 'power3.out', clearProps: 'all' },
    onComplete: forceHeroVisible   // belt-and-suspenders cleanup
  });

  tl.from('.hero-eyebrow',      { opacity: 0, x: -20, duration: 0.6 })
    .from('.hero-title',        { opacity: 0, y: 32,  duration: 0.7 }, '-=0.3')
    .from('.hero-sub',          { opacity: 0, y: 20,  duration: 0.6 }, '-=0.4')
    .from('.hero-btns > *',     { opacity: 0, y: 16,  stagger: 0.1, duration: 0.5 }, '-=0.4')
    .from('.hero-product-card', { opacity: 0, scale: 0.9, y: 30, duration: 0.8, ease: 'back.out(1.4)' }, '-=0.7')
    .from('.hero-chip',         { opacity: 0, scale: 0.85, stagger: 0.15, duration: 0.5, ease: 'back.out(1.5)' }, '-=0.5')
    .from('.hero-dots',         { opacity: 0, duration: 0.4 }, '-=0.3');

  // If tab was hidden during entrance, jump to end and clear everything
  document.addEventListener('visibilitychange', function onFocus() {
    if (!document.hidden) {
      tl.progress(1);          // snap to completed state
      forceHeroVisible();      // remove all inline GSAP styles
      document.removeEventListener('visibilitychange', onFocus);
    }
  });
}

/* ─── ACCENT WORD ROTATION ─── */
function initAccentRotation() {
  const el = document.querySelector('.hero-title .accent');
  if (!el) return;

  function rotateAccent() {
    accentIdx = (accentIdx + 1) % ACCENT_WORDS.length;
    gsap.timeline()
      .to(el, { opacity: 0, y: -12, duration: 0.25, ease: 'power2.in' })
      .call(() => {
        el.textContent = ACCENT_WORDS[accentIdx];
        gsap.set(el, { y: 14 }); // pre-position for entrance
      })
      .to(el, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: 'all' });
  }

  setInterval(rotateAccent, 2600);

  // When tab regains focus, ensure the accent word is always visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      gsap.killTweensOf(el);
      gsap.set(el, { opacity: 1, y: 0, clearProps: 'all' });
    }
  });
}

/* ─── HERO PRODUCT ROTATION ─── */
/* Idempotente: se puede llamar dos veces sin duplicar listeners ni intervals.
   Esto permite hacer un primer render con datos bundleados (instantáneo) y
   re-renderizar con datos frescos de Supabase cuando llegan, sin que aparezca
   el producto hardcoded como "flash" intermedio. */
let heroIdx = 0;
let heroRotating = false;
let heroInterval = null;
let heroIds = [];

function initHeroRotation() {
  const card   = document.querySelector('.hero-product-card');
  const img    = card?.querySelector('.hero-product-img');
  const lname  = card?.querySelector('.hero-product-label-name');
  const lcat   = card?.querySelector('.hero-product-label-cat');
  const badge  = document.getElementById('hero-badge');
  const dotsWrap = document.getElementById('hero-dots');
  if (!card || !img || !PRODUCTS.length) return;

  // Build featured list from DB; fall back to first 6 products by sort
  const featuredList = PRODUCTS.filter(p => p.featured).sort((a, b) => (a.featured_sort||0) - (b.featured_sort||0));
  heroIds = featuredList.length ? featuredList.map(p => p.id) : PRODUCTS.slice(0, 6).map(p => p.id);
  heroIdx = 0;

  // Clear interval previo si initHeroRotation se llama por segunda vez
  if (heroInterval) { clearInterval(heroInterval); heroInterval = null; }

  // Render dots dynamically
  if (dotsWrap) {
    dotsWrap.innerHTML = heroIds.map((_, i) =>
      `<button class="hero-dot ${i === 0 ? 'active' : ''}" aria-label="Producto ${i + 1}"></button>`
    ).join('');
  }

  function getDots() { return document.querySelectorAll('.hero-dot'); }

  function updateBadge(p) {
    if (!badge) return;
    if (p.badge && p.badge_enabled) {
      badge.textContent = p.badge;
      badge.style.background = BADGE_COLORS[p.badge_color] || BADGE_COLORS.green;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  function paint(p, animate) {
    if (!p) return;
    if (animate) {
      gsap.timeline({ onComplete: () => { heroRotating = false; } })
        .to(img, { opacity: 0, scale: 0.92, duration: 0.3, ease: 'power2.in' })
        .call(() => {
          img.src = p.img;
          img.alt = p.name;
          if (lname) lname.textContent = p.name;
          if (lcat)  lcat.textContent  = getCatLabel(primaryCat(p));
          updateBadge(p);
        })
        .to(img, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
    } else {
      img.src = p.img;
      img.alt = p.name;
      img.style.opacity = '1';
      if (lname) lname.textContent = p.name;
      if (lcat)  lcat.textContent  = getCatLabel(primaryCat(p));
      updateBadge(p);
    }
  }

  function goTo(idx) {
    if (heroRotating) return;
    heroRotating = true;
    const p = PRODUCTS.find(p => p.id === heroIds[idx]);
    if (!p) { heroRotating = false; return; }
    paint(p, true);
    getDots().forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  // Render del primer destacado SIN animación (instantáneo, para el primer paint).
  paint(PRODUCTS.find(p => p.id === heroIds[0]), false);

  // Dot clicks (re-bind seguro porque dotsWrap.innerHTML se reescribió arriba).
  getDots().forEach((d, i) => {
    d.addEventListener('click', () => { heroIdx = i; goTo(i); });
  });

  // Card click → producto. Solo se bindea una vez para evitar dobles handlers
  // si initHeroRotation se llama dos veces (bundle + Supabase).
  if (!card.dataset.bound) {
    card.addEventListener('click', () => {
      const p = PRODUCTS.find(p => p.id === heroIds[heroIdx]);
      if (p) window.location.href = `producto.html?id=${p.id}`;
    });
    card.dataset.bound = '1';
  }

  // Auto-rotate
  heroInterval = setInterval(() => {
    heroIdx = (heroIdx + 1) % heroIds.length;
    goTo(heroIdx);
  }, 4000);
}

/* ─── DYNAMIC STATS (count from the loaded data) ─── */
function applyDynamicStats() {
  // Stats que dependen de los datos actuales (DB o fallback).
  // El catálogo público solo carga productos activos, así que esto refleja
  // exactamente lo que ve el visitante.
  const counts = {
    products: PRODUCTS.length,
    categories: CATEGORIES.length,
    subcategories: SUBCATEGORIES.length,
    featured: PRODUCTS.filter(p => p.featured).length,
  };
  document.querySelectorAll('[data-stat]').forEach(el => {
    const key = el.dataset.stat;
    if (counts[key] != null) {
      el.dataset.count = counts[key];
      el.textContent = '0' + (el.dataset.suffix || '');
    }
  });
  // Chips flotantes del hero
  const chipProducts = document.getElementById('hero-chip-products');
  const chipCats     = document.getElementById('hero-chip-cats');
  if (chipProducts) chipProducts.textContent = '+' + counts.products;
  if (chipCats)     chipCats.textContent     = counts.categories;
}

/* ─── STATS COUNTER ─── */
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target  = parseFloat(el.dataset.count);
    const suffix  = el.dataset.suffix || '';
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target, duration: 2, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate() { el.textContent = Math.round(obj.val) + suffix; }
    });
  });
}

/* ─── SCROLL REVEAL ─── */
function initScrollReveal() {
  /*
   * KEY RULE: always gsap.set() → opacity 0 first, then gsap.to() → opacity 1.
   * Never use gsap.from() inside scroll callbacks — it momentarily sets
   * elements to opacity:0 mid-scroll, making them "disappear."
   * clearProps:'all' removes inline styles after animation so CSS is clean.
   */

  // ── Pre-hide ──────────────────────────────────────────────────────────────
  gsap.set('.section-title',   { opacity: 0, y: 20 });
  gsap.set('.why-card',        { opacity: 0, y: 20 });
  gsap.set('.cat-card',        { opacity: 0, y: 18 });
  gsap.set('.stat-item',       { opacity: 0, y: 12 });
  gsap.set('.about-stat',      { opacity: 0, y: 20 });
  gsap.set('.about-list-item', { opacity: 0, x: -18 });
  gsap.set('.contact-link',    { opacity: 0, y: 14 });

  // ── Section headings ─────────────────────────────────────────────────────
  gsap.utils.toArray('.section-title').forEach(el => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.65, ease: 'power2.out',
      clearProps: 'all',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  // ── Why cards ────────────────────────────────────────────────────────────
  ScrollTrigger.batch('.why-card', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1, y: 0, stagger: 0.1, duration: 0.55,
      ease: 'power2.out', clearProps: 'all'
    }),
    start: 'top 88%', once: true
  });

  // ── Category cards ───────────────────────────────────────────────────────
  ScrollTrigger.batch('.cat-card', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1, y: 0, stagger: 0.06, duration: 0.5,
      ease: 'power2.out', clearProps: 'all'
    }),
    start: 'top 88%', once: true
  });

  // ── Stats bar ────────────────────────────────────────────────────────────
  ScrollTrigger.batch('.stat-item', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1, y: 0, stagger: 0.08, duration: 0.45,
      ease: 'power2.out', clearProps: 'all'
    }),
    start: 'top 88%', once: true
  });

  // ── About stats ──────────────────────────────────────────────────────────
  ScrollTrigger.batch('.about-stat', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1, y: 0, stagger: 0.1, duration: 0.55,
      ease: 'power2.out', clearProps: 'all'
    }),
    start: 'top 88%', once: true
  });

  // ── About list ───────────────────────────────────────────────────────────
  ScrollTrigger.batch('.about-list-item', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1, x: 0, stagger: 0.08, duration: 0.5,
      ease: 'power2.out', clearProps: 'all'
    }),
    start: 'top 90%', once: true
  });

  // ── Contact links — trigger permisivo para evitar que queden en opacity:0
  // si las imágenes cambian la altura de la página después de calcular triggers.
  ScrollTrigger.batch('.contact-link', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1, y: 0, stagger: 0.07, duration: 0.45,
      ease: 'power2.out', clearProps: 'all'
    }),
    start: 'top bottom', once: true
  });
}

/* ─── CATEGORIES ─── */
function renderCategories() {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;
  grid.innerHTML = CATEGORIES.map(cat => {
    const count = PRODUCTS.filter(p => productHasCat(p, cat.key)).length;
    return `
    <div class="cat-card" data-cat="${cat.key}" onclick="filterByCat('${cat.key}')">
      <div class="cat-icon">${cat.icon}</div>
      <div class="cat-name">${cat.label}</div>
      <div class="cat-count">${count} productos</div>
    </div>`;
  }).join('');
}

/* ─── PRODUCTS ─── */
let currentCat    = 'all';
let currentSubcat = 'all';
let searchQuery   = '';
let showAll       = true;   // show all products by default
const PAGE_SIZE   = 200;    // effectively no pagination

const WA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

function getFiltered() {
  let list = currentCat === 'all' ? PRODUCTS : PRODUCTS.filter(p => productHasCat(p, currentCat));
  if (currentCat !== 'all' && currentSubcat !== 'all') {
    list = list.filter(p => productHasSubcat(p, currentSubcat));
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.short.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      productCatLabels(p).join(' ').toLowerCase().includes(q)
    );
  }
  return list;
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  const btn  = document.getElementById('load-more-btn');
  if (!grid) return;

  const filtered = getFiltered();
  const toShow   = showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  // Update result count label
  const countEl = document.getElementById('products-result-count');
  if (countEl) {
    if (searchQuery) {
      countEl.textContent = filtered.length === 0
        ? ''
        : `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} para "${searchQuery}"`;
    } else if (currentCat !== 'all') {
      countEl.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} en ${getCatLabel(currentCat)}`;
    } else {
      countEl.textContent = `${filtered.length} productos`;
    }
  }

  if (toShow.length === 0) {
    grid.innerHTML = `<div class="no-results">Sin resultados para "<strong>${searchQuery || currentCat}</strong>". Intentá otra búsqueda.</div>`;
  } else {
    grid.innerHTML = toShow.map(p => `
    <div class="product-card" data-id="${p.id}" onclick="openModal(${p.id})">
      <div class="product-img-wrap">
        <img src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.style.opacity='0'">
        <div class="product-cat-tags">${productCatLabels(p).map(l => `<span class="product-cat-tag">${l}</span>`).join('')}</div>
        ${(p.badge && p.badge_enabled) ? `<span class="product-badge" style="background:${BADGE_COLORS[p.badge_color]||BADGE_COLORS.green}">${p.badge}</span>` : ''}
      </div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-short">${p.short}</div>
        <a href="${waMsg(p.name)}" target="_blank" rel="noopener" class="btn-card-wa" onclick="event.stopPropagation()">
          ${WA_SVG} Consultar precio
        </a>
      </div>
    </div>`).join('');
  }

  if (btn) {
    const remaining = filtered.length - PAGE_SIZE;
    btn.style.display = (!showAll && remaining > 0) ? 'inline-flex' : 'none';
    if (!showAll && remaining > 0) btn.textContent = `Ver ${remaining} productos más`;
  }

  // GSAP stagger on new cards — set first, then animate TO avoid flash
  gsap.set('.product-card', { opacity: 0, y: 12 });
  gsap.to('.product-card', {
    opacity: 1, y: 0, duration: 0.3,
    stagger: 0.025, ease: 'power2.out',
    clearProps: 'all'
  });
}

function filterByCat(cat) {
  currentCat    = cat;
  currentSubcat = 'all';
  showAll       = true;

  document.querySelectorAll('.filter-pill').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  document.querySelectorAll('.cat-card').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));

  buildSubcatPills();
  renderProducts();
  document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function filterBySubcat(sub) {
  currentSubcat = sub;
  showAll       = true;
  document.querySelectorAll('.subfilter-pill').forEach(b => b.classList.toggle('active', b.dataset.subcat === sub));
  renderProducts();
}

function buildFilterPills() {
  const wrap = document.getElementById('filter-pills');
  if (!wrap) return;
  const all = [{ key:'all', label:`Todos (${PRODUCTS.length})` }, ...CATEGORIES.map(c => ({
    key: c.key,
    label: `${c.label} (${PRODUCTS.filter(p=>productHasCat(p,c.key)).length})`
  }))];
  wrap.innerHTML = all.map(c =>
    `<button class="filter-pill ${c.key==='all'?'active':''}" data-cat="${c.key}" onclick="filterByCat('${c.key}')">${c.label}</button>`
  ).join('');
}

function buildSubcatPills() {
  const wrap = document.getElementById('subfilter-pills');
  if (!wrap) return;
  if (currentCat === 'all') { wrap.innerHTML = ''; wrap.classList.remove('visible'); return; }

  const subs = getSubcatsForCat(currentCat)
    .map(s => ({ ...s, count: PRODUCTS.filter(p => productHasCat(p, currentCat) && productHasSubcat(p, s.key)).length }))
    .filter(s => s.count > 0);

  if (subs.length === 0) { wrap.innerHTML = ''; wrap.classList.remove('visible'); return; }

  const total = PRODUCTS.filter(p => productHasCat(p, currentCat)).length;
  const pills = [{ key:'all', label:`Todas (${total})` }, ...subs.map(s => ({
    key: s.key, label: `${s.label} (${s.count})`
  }))];
  wrap.classList.add('visible');
  wrap.innerHTML = pills.map(s =>
    `<button class="subfilter-pill ${s.key==='all'?'active':''}" data-subcat="${s.key}" onclick="filterBySubcat('${s.key}')">${s.label}</button>`
  ).join('');
}

/* ─── SEARCH ─── */
function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      searchQuery = input.value.trim();
      showAll     = true;
      renderProducts();
    }, 150);
  });
}

/* ─── MODAL ─── */
let modalOpen = false;

function openModal(id) {
  const p = getProductById(id);
  if (!p) return;

  document.getElementById('modal-img').src          = p.img;
  document.getElementById('modal-img').alt          = p.name;
  document.getElementById('modal-tag').textContent  = productCatLabels(p).join(' · ');
  document.getElementById('modal-name').textContent = p.name;
  document.getElementById('modal-desc').textContent = p.desc;
  document.getElementById('modal-wa-btn').href      = waMsg(p.name);
  document.getElementById('modal-page-btn').href    = `producto.html?id=${p.id}`;

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  modalOpen = true;

  gsap.from('.modal', { y: 24, scale: 0.96, duration: 0.35, ease: 'back.out(1.2)', clearProps: 'all' });
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  gsap.to('.modal', {
    opacity: 0, y: 12, scale: 0.97, duration: 0.22, ease: 'power2.in',
    onComplete() {
      overlay.classList.remove('open');
      gsap.set('.modal', { clearProps: 'all' });
      document.body.style.overflow = '';
      modalOpen = false;
    }
  });
}

function initModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalOpen) closeModal(); });
}

/* ─── SCROLL TO TOP ─── */
function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
}

/* ─── INIT ─── */
// Todo lo que depende de los datos. Se llama dos veces: una con el bundle
// (instantáneo) y otra después de Supabase si trajo datos. Así nunca se ve
// el hero hardcodeado mientras la DB responde.
function renderAllDataDependent() {
  renderCategories();
  buildFilterPills();
  buildSubcatPills();
  renderProducts();
  applyDynamicStats();
  initHeroRotation();
}

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  initTicker();

  // 1) Primer paint con datos bundleados (instantáneo).
  renderAllDataDependent();
  initSearch();
  initModal();
  initScrollTop();
  animateCounters();
  initScrollReveal();

  // Hero entrance + accent rotation (la rotación de productos ya arrancó
  // dentro de initHeroRotation()).
  gsap.delayedCall(0.1, () => {
    heroEntrance();
    initAccentRotation();
  });

  // 2) En paralelo, traemos Supabase. Si vino con datos, re-renderizamos
  //    todo lo que depende de los datos (incluido el hero rotation, que
  //    ahora es idempotente).
  if (typeof loadDataFromSupabase === 'function') {
    try {
      const ok = await loadDataFromSupabase();
      if (ok) renderAllDataDependent();
    } catch (e) { /* keep fallback */ }
  }
});

// Recalcular posiciones de ScrollTrigger después de que carguen las imágenes.
// Evita que los triggers se calculen con una altura de página incorrecta (pre-imágenes),
// lo que dejaba los datos de contacto en opacity:0 permanentemente.
window.addEventListener('load', () => ScrollTrigger.refresh());
