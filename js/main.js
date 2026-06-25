/* ===== EBTOOLS — MAIN JS (GSAP) ===== */
/* global gsap, ScrollTrigger, TextPlugin  */

gsap.registerPlugin(ScrollTrigger, TextPlugin);

/* ─── TEXT FORMATTING ─── */
/* Preserva saltos de línea del editor en la descripción del producto.
   Escapa HTML para evitar XSS y convierte \n en <br>. */
function descToHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

/* ─── BADGE COLOR MAP ─── */
const BADGE_COLORS = {
  green: '#22c55e', red: '#ef4444', yellow: '#f59e0b',
  orange: '#f47b20', blue: '#3b82f6', black: '#0f0f0f',
};

/* ─── IMAGE OPTIMIZATION ─── */
/**
 * Supabase Image Transform — requires the Pro plan ("image transformations" add-on).
 * When enabled, images are served as WebP at reduced dimensions via the
 * render/image CDN endpoint. On free/starter plans the endpoint returns 404,
 * causing a double-fetch per image (shimmer → 404 → fallback load).
 * Keep this FALSE until you've confirmed your plan supports it.
 */
const USE_IMG_TRANSFORM = false;

/**
 * Converts a Supabase Storage "object" URL to the "render/image" endpoint
 * so Supabase CDN handles resize + WebP conversion before the browser ever
 * requests the bytes. External (non-Supabase) URLs are returned unchanged.
 *
 * Before: .../storage/v1/object/public/bucket/path.jpg
 * After:  .../storage/v1/render/image/public/bucket/path.jpg?width=480&format=webp&quality=82
 */
function optimizeImgUrl(url, width = 480, quality = 82) {
  if (!url || !USE_IMG_TRANSFORM) return url;
  const m = url.match(/^(https:\/\/[^/]+\.supabase\.co\/storage\/v1\/)object\/(public\/.+?)(\?.*)?$/);
  if (!m) return url; // external URL — no transformation available
  return `${m[1]}render/image/${m[2]}?width=${width}&format=webp&quality=${quality}`;
}

/** 1x / 2x srcset for Supabase images (empty string when transforms off or external URL). */
function imgSrcset(url, baseWidth = 480, quality = 82) {
  if (!USE_IMG_TRANSFORM) return '';
  const u1x = optimizeImgUrl(url, baseWidth, quality);
  if (u1x === url) return ''; // not a Supabase URL
  return `${u1x} 1x, ${optimizeImgUrl(url, baseWidth * 2, quality)} 2x`;
}

/**
 * After injecting card HTML via innerHTML, browsers may not fire `onload`
 * for images already in cache. This helper marks any already-complete image
 * wrap immediately so the skeleton shimmer hides without waiting for onload.
 */
function markLoadedImages(container) {
  container.querySelectorAll('.product-img-wrap img').forEach(img => {
    if (img.complete && img.naturalWidth > 0) {
      img.closest('.product-img-wrap')?.classList.add('img-loaded');
    }
  });
}

/* ─── FUZZY SEARCH HELPERS ─── */
/* Strips accent marks and lowercases — lets "neumatica" match "neumática". */
function normalize(str) {
  return String(str || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/* Bigram similarity: measures how many consecutive 2-char pairs from `query`
   appear in `text`. Returns 0–1. Handles common typos like "tigera"→"tijera"
   because they share most bigrams (ti, er, ra) despite one transposition. */
function bigramScore(text, query) {
  if (text.includes(query)) return 1; // exact substring: perfect
  if (query.length < 2) return 0;
  const bigrams = s => { const b = new Set(); for (let i = 0; i < s.length - 1; i++) b.add(s.slice(i, i + 2)); return b; };
  const tb = bigrams(text), qb = bigrams(query);
  if (!qb.size) return 0;
  let hits = 0; qb.forEach(g => { if (tb.has(g)) hits++; });
  return hits / qb.size;
}

function productMatchesFuzzy(p, q) {
  const THRESHOLD = 0.5; // at least half the bigrams must match
  const nq = normalize(q);
  return [
    normalize(p.name), normalize(p.short), normalize(p.desc),
    ...productCatLabels(p).map(l => normalize(l)),
  ].some(f => bigramScore(f, nq) >= THRESHOLD);
}

/* ─── AVAILABILITY ─── */
const AVAIL = {
  available:    { label: 'Disponible',  color: '#22c55e' },
  out_of_stock: { label: 'Sin stock',   color: '#ef4444' },
  on_request:   { label: 'Bajo pedido', color: '#f59e0b' },
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
  // Strong ease-out: starts fast (instant feedback), decelerates naturally.
  // Nothing slides from far — small offsets feel like elements "arriving",
  // large offsets feel like PowerPoint transitions.
  const E = 'cubic-bezier(0.23, 1, 0.32, 1)';

  const tl = gsap.timeline({
    defaults: { ease: E, clearProps: 'all' },
    onComplete: forceHeroVisible
  });

  tl.from('.hero-eyebrow',      { opacity: 0, y: 8,  duration: 0.38 })
    .from('.hero-title',        { opacity: 0, y: 12, duration: 0.46 }, '-=0.26')
    .from('.hero-sub',          { opacity: 0, y: 8,  duration: 0.38 }, '-=0.3')
    .from('.hero-trust',        { opacity: 0, y: 6,  duration: 0.34 }, '-=0.28')
    .from('.hero-btns > *',     { opacity: 0, y: 6,  stagger: 0.055, duration: 0.34 }, '-=0.3')
    .from('.hero-product-card', { opacity: 0, scale: 0.96, y: 12, duration: 0.52, ease: 'back.out(1.05)' }, '-=0.42')
    .from('.hero-chip',         { opacity: 0, scale: 0.94, stagger: 0.09, duration: 0.38, ease: 'back.out(1.05)' }, '-=0.36')
    .from('.hero-dots',         { opacity: 0, duration: 0.26 }, '-=0.2');

  document.addEventListener('visibilitychange', function onFocus() {
    if (!document.hidden) {
      tl.progress(1);
      forceHeroVisible();
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
          img.src = optimizeImgUrl(p.img, 640, 85);
          img.alt = p.name;
          if (lname) lname.textContent = p.name;
          if (lcat)  lcat.textContent  = getCatLabel(primaryCat(p));
          updateBadge(p);
        })
        .to(img, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
    } else {
      img.src = optimizeImgUrl(p.img, 640, 85);
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
   * Never gsap.from() inside scroll callbacks.
   * clearProps:'all' removes inline styles post-animation.
   *
   * ANIMATION PHILOSOPHY (Emil Kowalski):
   *   - Small y offsets (6–10px) feel like elements "arrive".
   *     Large offsets (20–32px) feel like PowerPoint slides.
   *   - Tight stagger (30–50ms): elements appear almost together,
   *     not one-by-one like a slideshow.
   *   - Short durations (330–440ms): snappy = intentional.
   *   - Strong ease-out (cubic-bezier 0.23 1 0.32 1): instant start,
   *     graceful settle — always faster-feeling than power2.out.
   */
  const E = 'cubic-bezier(0.23, 1, 0.32, 1)';

  // ── Pre-hide (minimal offsets so nothing "flies" on entrance) ─────────────
  gsap.set('.section-title',   { opacity: 0, y: 10 });
  gsap.set('.why-card',        { opacity: 0, y: 10 });
  gsap.set('.cat-card',        { opacity: 0, scale: 0.97 });
  gsap.set('.stat-item',       { opacity: 0, y: 6  });
  gsap.set('.about-stat',      { opacity: 0, y: 10 });
  gsap.set('.about-list-item', { opacity: 0, x: -8 });
  gsap.set('.contact-link',    { opacity: 0, y: 7  });

  // ── Section headings ─────────────────────────────────────────────────────
  gsap.utils.toArray('.section-title').forEach(el => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.46, ease: E,
      clearProps: 'all',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  // ── Why cards ────────────────────────────────────────────────────────────
  ScrollTrigger.batch('.why-card', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1, y: 0, stagger: 0.045, duration: 0.42,
      ease: E, clearProps: 'all'
    }),
    start: 'top 88%', once: true
  });

  // ── Category cards — scale fade (no slide, just arrive) ──────────────────
  ScrollTrigger.batch('.cat-card', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1, scale: 1, stagger: 0.03, duration: 0.36,
      ease: E, clearProps: 'all'
    }),
    start: 'top 88%', once: true
  });

  // ── Stats bar ────────────────────────────────────────────────────────────
  ScrollTrigger.batch('.stat-item', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1, y: 0, stagger: 0.035, duration: 0.34,
      ease: E, clearProps: 'all'
    }),
    start: 'top 88%', once: true
  });

  // ── About stats ──────────────────────────────────────────────────────────
  ScrollTrigger.batch('.about-stat', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1, y: 0, stagger: 0.05, duration: 0.42,
      ease: E, clearProps: 'all'
    }),
    start: 'top 88%', once: true
  });

  // ── About list ───────────────────────────────────────────────────────────
  ScrollTrigger.batch('.about-list-item', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1, x: 0, stagger: 0.04, duration: 0.4,
      ease: E, clearProps: 'all'
    }),
    start: 'top 90%', once: true
  });

  // ── Contact links — permissive trigger so they never stay at opacity:0 ───
  ScrollTrigger.batch('.contact-link', {
    onEnter: batch => gsap.to(batch, {
      opacity: 1, y: 0, stagger: 0.04, duration: 0.34,
      ease: E, clearProps: 'all'
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
let _fuzzyActive  = false;  // true when showing approximate results
// Fewer products on small screens = fewer image requests on first paint.
// Mobile (< 480): 2-col grid → 8 = 4 rows.  Tablet: 3-col → 12.  Desktop: 4-col → 16.
const PAGE_SIZE  = window.innerWidth < 480 ? 8 : window.innerWidth < 768 ? 12 : 16;
let visibleCount = PAGE_SIZE;
let _loadMoreObserver = null; // IntersectionObserver for auto-pagination

const WA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

function getFiltered() {
  let list = currentCat === 'all' ? PRODUCTS : PRODUCTS.filter(p => productHasCat(p, currentCat));
  if (currentCat !== 'all' && currentSubcat !== 'all') {
    list = list.filter(p => productHasSubcat(p, currentSubcat));
  }
  if (searchQuery) {
    const nq = normalize(searchQuery);
    // Accent-insensitive exact substring match
    let exact = list.filter(p =>
      normalize(p.name).includes(nq) ||
      normalize(p.short).includes(nq) ||
      normalize(p.desc).includes(nq) ||
      productCatLabels(p).map(l => normalize(l)).join(' ').includes(nq)
    );
    if (exact.length > 0) {
      _fuzzyActive = false;
      list = exact;
    } else if (nq.length >= 3) {
      // Fuzzy fallback: bigram similarity handles typos ("tigera"→"tijera")
      const fuzzy = list.filter(p => productMatchesFuzzy(p, nq));
      _fuzzyActive = fuzzy.length > 0;
      list = fuzzy;
    } else {
      _fuzzyActive = false;
      list = [];
    }
  } else {
    _fuzzyActive = false;
  }
  // Catalog-pinned products always appear first (sorted by catalog_order).
  // Non-pinned products follow in their default Supabase sort order.
  const hasPinned = list.some(p => p.catalog_pinned);
  if (hasPinned) {
    list = [
      ...list.filter(p => p.catalog_pinned).sort((a, b) => (a.catalog_order || 0) - (b.catalog_order || 0)),
      ...list.filter(p => !p.catalog_pinned),
    ];
  }
  return list;
}

const CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>`;

function productCardHTML(p) {
  const thumb   = optimizeImgUrl(p.img, 480, 82);
  const srcset  = imgSrcset(p.img, 480, 82);
  const isOpt   = thumb !== p.img;
  // If Supabase transform is unavailable (free plan), onerror falls back to original URL
  const onErr   = isOpt
    ? `this.onerror=null;this.removeAttribute('srcset');this.src='${p.img}'`
    : `this.style.opacity='0'`;
  const avail   = p.availability || 'available';
  const availChip = avail !== 'available'
    ? `<span class="avail-chip avail-chip--${avail}">${AVAIL[avail]?.label || avail}</span>`
    : '';
  return `<div class="product-card" data-id="${p.id}" onclick="openModal(${p.id})">
    <div class="product-img-wrap">
      <img src="${thumb}"${srcset ? ` srcset="${srcset}"` : ''} alt="${p.name}"
           loading="lazy" decoding="async"
           onload="this.closest('.product-img-wrap')?.classList.add('img-loaded')"
           onerror="${onErr}">
      <div class="product-cat-tags">${productCatLabels(p).map(l => `<span class="product-cat-tag">${l}</span>`).join('')}</div>
      ${(p.badge && p.badge_enabled) ? `<span class="product-badge" style="background:${BADGE_COLORS[p.badge_color]||BADGE_COLORS.green}">${p.badge}</span>` : ''}
      ${availChip}
    </div>
    <div class="product-body">
      <div class="product-name">${p.name}</div>
      <div class="product-short">${p.short}</div>
      <a href="${waMsg(p.name)}" target="_blank" rel="noopener" class="btn-card-wa" onclick="event.stopPropagation()">
        ${WA_SVG} Consultar por WhatsApp
      </a>
    </div>
  </div>`;
}

function updateLoadMoreBtn(filtered) {
  const btn = document.getElementById('load-more-btn');
  if (!btn) return;
  const remaining = filtered.length - visibleCount;
  if (remaining <= 0) {
    btn.style.display = 'none';
  } else {
    btn.style.display = 'inline-flex';
    btn.innerHTML = `Ver ${remaining} producto${remaining !== 1 ? 's' : ''} más ${CHEVRON_DOWN}`;
  }
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const filtered = getFiltered();
  const toShow   = filtered.slice(0, visibleCount);

  // Update result count label
  const countEl = document.getElementById('products-result-count');
  if (countEl) {
    if (searchQuery) {
      if (filtered.length === 0) {
        countEl.textContent = '';
      } else if (_fuzzyActive) {
        countEl.textContent = `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} aproximados para "${searchQuery}"`;
      } else {
        countEl.textContent = `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} para "${searchQuery}"`;
      }
    } else if (currentCat !== 'all') {
      countEl.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} en ${getCatLabel(currentCat)}`;
    } else {
      countEl.textContent = `${filtered.length} productos`;
    }
  }

  if (toShow.length === 0) {
    grid.innerHTML = `<div class="no-results">Sin resultados para "<strong>${searchQuery || currentCat}</strong>". Intentá otra búsqueda.</div>`;
  } else {
    grid.innerHTML = toShow.map(p => productCardHTML(p)).join('');
    // Cached images won't fire onload when injected via innerHTML — mark them now
    markLoadedImages(grid);
  }

  updateLoadMoreBtn(filtered);

  // GSAP stagger on new cards — set first, then animate TO avoid flash
  gsap.set('.product-card', { opacity: 0, y: 12 });
  gsap.to('.product-card', {
    opacity: 1, y: 0, duration: 0.3,
    stagger: 0.025, ease: 'power2.out',
    clearProps: 'all'
  });
}

function loadMore() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const filtered  = getFiltered();
  const from      = Math.min(visibleCount, filtered.length);
  visibleCount    = Math.min(visibleCount + PAGE_SIZE, filtered.length);
  const newItems  = filtered.slice(from, visibleCount);
  if (newItems.length === 0) return;

  // Append only the new cards — existing cards never re-render or re-animate
  const tpl = document.createElement('template');
  tpl.innerHTML = newItems.map(p => productCardHTML(p)).join('');
  const newNodes = Array.from(tpl.content.children);
  newNodes.forEach(node => grid.appendChild(node));
  // Cached images won't fire onload when inserted via appendChild — mark them now
  newNodes.forEach(node => {
    const wrap = node.querySelector?.('.product-img-wrap');
    if (!wrap) return;
    const img = wrap.querySelector('img');
    if (img?.complete && img.naturalWidth > 0) wrap.classList.add('img-loaded');
  });

  // Stagger-animate only the newly added cards
  gsap.set(newNodes, { opacity: 0, y: 18 });
  gsap.to(newNodes, {
    opacity: 1, y: 0,
    duration: 0.4, stagger: 0.04,
    ease: 'power2.out', clearProps: 'all'
  });

  updateLoadMoreBtn(filtered);
}

function filterByCat(cat) {
  currentCat    = cat;
  currentSubcat = 'all';
  visibleCount  = PAGE_SIZE;

  document.querySelectorAll('.filter-pill').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  document.querySelectorAll('.cat-card').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));

  buildSubcatPills();
  renderProducts();
  document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function filterBySubcat(sub) {
  currentSubcat = sub;
  visibleCount  = PAGE_SIZE;
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
      searchQuery  = input.value.trim();
      visibleCount = PAGE_SIZE;
      renderProducts();
    }, 150);
  });
}

/* ─── MODAL ─── */
let modalOpen = false;

function openModal(id) {
  const p = getProductById(id);
  if (!p) return;
  if (typeof trackProductClick === 'function') trackProductClick(id);

  // Fade out the current image before swapping src — prevents the old
  // product photo from being briefly visible while the new one loads.
  const imgEl = document.getElementById('modal-img');
  imgEl.style.opacity = '0';
  const restoreOpacity = () => {
    imgEl.style.opacity = '1';
    imgEl.onload  = null;
    imgEl.onerror = null;
  };
  imgEl.onload  = restoreOpacity;
  imgEl.onerror = restoreOpacity;
  imgEl.src = optimizeImgUrl(p.img, 960, 88);
  imgEl.alt = p.name;
  document.getElementById('modal-tag').textContent  = productCatLabels(p).join(' · ');
  document.getElementById('modal-name').textContent = p.name;
  document.getElementById('modal-desc').innerHTML   = descToHtml(p.desc);
  document.getElementById('modal-wa-btn').href      = waMsg(p.name);
  document.getElementById('modal-page-btn').href    = `producto.html?id=${p.id}`;

  const availEl = document.getElementById('modal-avail');
  if (availEl) {
    const avail = p.availability || 'available';
    const cfg = AVAIL[avail] || AVAIL.available;
    availEl.innerHTML = `<span class="avail-dot" style="background:${cfg.color}"></span>${cfg.label}`;
    availEl.style.display = 'flex';
  }

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

/* ─── ANCHOR SCROLL SIN HASH EN URL ─── */
/* Links href="#seccion" → scroll suave al destino, URL queda limpia (sin #hash). */
function initAnchorScroll() {
  const NAVBAR_H = 68;
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (!hash || hash === '#') return;
    const target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - NAVBAR_H;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    history.replaceState(null, '', location.pathname);
  });
}

/* ─── PAGE TRANSITIONS ─── */
/* Fade out antes de navegar a una página interna. El fade-in lo maneja
   la animación CSS `eb-page-in` definida en styles.css. */
function initPageTransitions() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    // Saltar: nueva pestaña, anchors, mailto/tel, URLs externas
    if (a.target === '_blank') return;
    if (href.startsWith('#')) return;
    if (/^(https?:|mailto:|tel:|javascript)/.test(href)) return;
    e.preventDefault();
    const dest = href;
    gsap.to(document.body, {
      opacity: 0, duration: 0.18, ease: 'power2.in',
      onComplete() { window.location.href = dest; }
    });
  });
}

/* ─── SCROLL TO TOP ─── */
function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
}

/* ─── AUTO-PAGINATION (IntersectionObserver) ─── */
/* Loads the next batch automatically when the user scrolls to within
   400px of the "Ver más" button — no click required.
   The button remains visible so users know there's more content. */
function initAutoLoadMore() {
  const btn = document.getElementById('load-more-btn');
  if (!btn) return;
  if (_loadMoreObserver) _loadMoreObserver.disconnect();
  _loadMoreObserver = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) loadMore(); },
    { rootMargin: '0px 0px 400px 0px' } // fire 400px before button enters viewport
  );
  _loadMoreObserver.observe(btn);
}

/* ─── SITE BANNER ─── */
function initBanner() {
  const banner = document.getElementById('site-banner');
  const textEl = document.getElementById('site-banner-text');
  if (!banner || !textEl) return;
  const data = window.SITE_BANNER;
  if (!data || !data.active || !data.text) { banner.style.display = 'none'; return; }
  textEl.textContent = data.text;
  banner.style.display = 'flex';
  // Banner is now in-flow (below the ticker). Entrance: expand from 0 height
  // so it naturally pushes the hero down without a jarring layout jump.
  gsap.from(banner, {
    height: 0, paddingTop: 0, paddingBottom: 0, opacity: 0,
    duration: 0.4, ease: 'power2.out', clearProps: 'all'
  });
}

function dismissBanner() {
  const banner = document.getElementById('site-banner');
  if (!banner) return;
  // Collapse height to 0 — content above (ticker) and below (hero) animate smoothly together.
  gsap.to(banner, {
    height: 0, paddingTop: 0, paddingBottom: 0, opacity: 0,
    duration: 0.28, ease: 'power2.in',
    onComplete() {
      banner.style.display = 'none';
      gsap.set(banner, { clearProps: 'all' });
    }
  });
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
  initAnchorScroll();
  initPageTransitions();

  // 1) Primer paint con datos bundleados (instantáneo).
  renderAllDataDependent();
  initSearch();
  initModal();
  initScrollTop();
  initAutoLoadMore();
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
      if (ok) {
        renderAllDataDependent();
        initBanner();
        // Recalcular posiciones después de que los datos de Supabase cambiaron la altura de la página.
        // Sin esto, los triggers de .about-stat, .contact-link etc. quedan con posiciones del layout
        // pre-Supabase, y los elementos se quedan en opacity:0 permanentemente.
        requestAnimationFrame(() => requestAnimationFrame(() => ScrollTrigger.refresh()));
      }
    } catch (e) { /* keep fallback */ }
  }
});

// Recalcular posiciones de ScrollTrigger después de que carguen las imágenes.
// Evita que los triggers se calculen con una altura de página incorrecta (pre-imágenes),
// lo que dejaba los datos de contacto en opacity:0 permanentemente.
window.addEventListener('load', () => ScrollTrigger.refresh());
