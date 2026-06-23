/* ===== EBTOOLS — PRODUCT PAGE JS ===== */
gsap.registerPlugin(ScrollTrigger);

/* ─── TEXT FORMATTING ─── */
function descToHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const toggle = document.getElementById('nav-toggle');
  const menu   = document.getElementById('nav-menu');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });
  toggle?.addEventListener('click', () => menu.classList.toggle('open'));
  document.querySelectorAll('.nav-menu a').forEach(a => {
    a.addEventListener('click', () => menu.classList.remove('open'));
  });
}

function renderProduct() {
  const params  = new URLSearchParams(window.location.search);
  const id      = params.get('id');
  const product = getProductById(id);

  if (!product) {
    document.getElementById('product-name').textContent = 'Producto no encontrado';
    document.getElementById('product-desc').textContent = 'El producto que buscás no existe o fue eliminado.';
    return;
  }

  // Update meta
  document.title = `${product.name} — EBTOOLS`;
  document.getElementById('meta-desc').content = product.desc.slice(0, 160);

  // Breadcrumb
  document.getElementById('breadcrumb-cat').textContent  = getCatLabel(primaryCat(product));
  document.getElementById('breadcrumb-name').textContent = product.name;

  // Fallback img (mismo elemento que antes, oculto pero accesible si algo lo usa)
  const img = document.getElementById('product-img');
  if (img) { img.src = product.img; img.alt = product.name; }

  document.getElementById('product-cat').textContent  = productCatLabels(product).join(' · ');
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-desc').innerHTML = descToHtml(product.desc);

  // WhatsApp links
  const waLink = waMsg(product.name);
  document.getElementById('product-wa-btn').href = waLink;
  document.getElementById('wa-float-link').href  = waLink;
  document.getElementById('cta-wa-btn').href     = waLink;

  // Carrusel: fotos + videos integrados en el mismo carrete
  initCarousel(product);

  // Related
  renderRelated(product);
}

/* ========== CAROUSEL (fotos + videos integrados) ========== */
const CAROUSEL = { items: [], index: 0 };

/* Parsea una URL de video para saber qué tipo es:
   - YouTube: { type: 'yt', id, url }
   - Archivo de video directo (.mp4/.webm/.mov/etc.): { type: 'vid', url }
   - Imagen:  { type: 'img', url } */
function parseMediaItem(url) {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: 'yt', id: ytMatch[1], url };
  if (/\.(mp4|webm|mov|avi|mkv|ogv)(\?|$)/i.test(url)) return { type: 'vid', url };
  return { type: 'img', url };
}

const PLAY_SVG_LG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><polygon points="6 4 20 12 6 20"/></svg>`;
const PLAY_SVG_SM = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="6 4 20 12 6 20"/></svg>`;
const YT_BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M21.582 6.186a2.506 2.506 0 0 0-1.768-1.768C18.254 4 12 4 12 4s-6.254 0-7.814.418a2.506 2.506 0 0 0-1.768 1.768C2 7.746 2 12 2 12s0 4.254.418 5.814a2.506 2.506 0 0 0 1.768 1.768C5.746 20 12 20 12 20s6.254 0 7.814-.418a2.506 2.506 0 0 0 1.768-1.768C22 16.254 22 12 22 12s0-4.254-.418-5.814zM10 15.5v-7l6 3.5-6 3.5z"/></svg>`;

function buildSlideHtml(item, i, productName) {
  if (item.type === 'yt') {
    const poster = `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
    return `<div class="carousel-slide carousel-slide--yt" data-idx="${i}" data-yt="${escAttr(item.id)}">
      <img src="${escAttr(poster)}" alt="Video ${i + 1} — ${escAttr(productName)}" loading="lazy"
           onerror="this.src='https://i.ytimg.com/vi/${escAttr(item.id)}/mqdefault.jpg'">
      <div class="slide-play-btn">${PLAY_SVG_LG}</div>
      <span class="slide-yt-badge">${YT_BADGE_SVG} YouTube</span>
    </div>`;
  }
  if (item.type === 'vid') {
    return `<div class="carousel-slide carousel-slide--vid" data-idx="${i}">
      <video src="${escAttr(item.url)}" playsinline preload="metadata"
             onerror="this.parentElement.style.display='none'"></video>
      <div class="slide-play-btn">${PLAY_SVG_LG}</div>
    </div>`;
  }
  // img
  return `<div class="carousel-slide" data-idx="${i}">
    <img src="${escAttr(item.url)}" alt="${escAttr(productName)} — imagen ${i + 1}"
         loading="${i === 0 ? 'eager' : 'lazy'}"
         onerror="this.style.opacity='0'">
  </div>`;
}

function buildThumbHtml(item, i) {
  if (item.type === 'yt') {
    const poster = `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
    return `<button class="gallery-thumb gallery-thumb--yt ${i === 0 ? 'active' : ''}" data-go="${i}" aria-label="Video ${i + 1}">
      <img src="${escAttr(poster)}" alt="" loading="lazy">
      <span class="thumb-play-icon">${PLAY_SVG_SM}</span>
    </button>`;
  }
  if (item.type === 'vid') {
    return `<button class="gallery-thumb gallery-thumb--vid ${i === 0 ? 'active' : ''}" data-go="${i}" aria-label="Video ${i + 1}">
      <span class="thumb-play-icon">${PLAY_SVG_SM}</span>
    </button>`;
  }
  return `<button class="gallery-thumb ${i === 0 ? 'active' : ''}" data-go="${i}" aria-label="Imagen ${i + 1}">
    <img src="${escAttr(item.url)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'">
  </button>`;
}

function initCarousel(product) {
  const wrapEl   = document.getElementById('carousel');
  const trackEl  = document.getElementById('carousel-track');
  const dotsEl   = document.getElementById('carousel-dots');
  const thumbsEl = document.getElementById('gallery-thumbs');
  const counterEl= document.getElementById('carousel-counter');
  const prevBtn  = document.getElementById('carousel-prev');
  const nextBtn  = document.getElementById('carousel-next');
  if (!wrapEl || !trackEl) return;

  // Construir lista de media: primero fotos, luego videos
  const imgUrls = [product.img, ...(product.images || [])].filter(u => u && u.trim());
  const vidUrls = (product.videos || []).filter(u => u && u.trim());
  const items   = [...imgUrls.map(parseMediaItem), ...vidUrls.map(parseMediaItem)];

  CAROUSEL.items = items;
  CAROUSEL.index = 0;

  if (!items.length) { wrapEl.style.display = 'none'; return; }

  // Ocultar sección de videos separada (están integrados en el carrusel)
  const vidSection = document.getElementById('videos-section');
  if (vidSection) vidSection.style.display = 'none';

  // Slides
  trackEl.innerHTML = items.map((item, i) => buildSlideHtml(item, i, product.name)).join('');

  // YT click-to-play dentro del slide
  trackEl.querySelectorAll('.carousel-slide--yt').forEach(slide => {
    slide.addEventListener('click', () => {
      if (slide.classList.contains('playing')) return;
      const id = slide.dataset.yt;
      slide.classList.add('playing');
      slide.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0"
        title="Video del producto" frameborder="0" allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
    });
  });

  // Video directo click-to-play — igual que YT: botón grande centrado, click activa controles nativos
  trackEl.querySelectorAll('.carousel-slide--vid').forEach(slide => {
    const video = slide.querySelector('video');
    const playBtn = slide.querySelector('.slide-play-btn');
    if (!video || !playBtn) return;

    slide.addEventListener('click', () => {
      if (slide.classList.contains('playing')) return;
      video.controls = true;
      playBtn.style.display = 'none';
      slide.classList.add('playing');
      video.play();
    });

    // Al terminar el video: vuelve al estado inicial con el botón grande
    video.addEventListener('ended', () => {
      slide.classList.remove('playing');
      video.controls = false;
      video.currentTime = 0;
      playBtn.style.display = '';
    });
  });

  // Dots + thumbs solo si hay más de 1 item
  const showNav = items.length > 1;
  wrapEl.classList.toggle('has-multiple', showNav);

  if (dotsEl) {
    dotsEl.innerHTML = showNav
      ? items.map((_, i) =>
          `<button class="carousel-dot ${i === 0 ? 'active' : ''}" data-go="${i}" aria-label="Ítem ${i + 1}"></button>`
        ).join('')
      : '';
  }

  if (thumbsEl) {
    thumbsEl.innerHTML = showNav
      ? items.map((item, i) => buildThumbHtml(item, i)).join('')
      : '';
  }

  if (counterEl) counterEl.textContent = `1 / ${items.length}`;
  if (counterEl) counterEl.style.display = showNav ? '' : 'none';

  // Listeners
  prevBtn?.addEventListener('click', () => goCarousel(-1));
  nextBtn?.addEventListener('click', () => goCarousel(+1));
  dotsEl?.addEventListener('click', e => {
    const b = e.target.closest('button[data-go]');
    if (b) goCarouselTo(Number(b.dataset.go));
  });
  thumbsEl?.addEventListener('click', e => {
    const b = e.target.closest('button[data-go]');
    if (b) goCarouselTo(Number(b.dataset.go));
  });

  // Teclado (← →)
  document.addEventListener('keydown', e => {
    if (!showNav) return;
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'ArrowLeft')  goCarousel(-1);
    if (e.key === 'ArrowRight') goCarousel(+1);
  });

  // Swipe en mobile
  bindCarouselSwipe(trackEl);

  goCarouselTo(0);
}

function escAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function goCarousel(delta) {
  if (!CAROUSEL.items.length) return;
  const next = (CAROUSEL.index + delta + CAROUSEL.items.length) % CAROUSEL.items.length;
  goCarouselTo(next);
}

function goCarouselTo(idx) {
  const trackEl = document.getElementById('carousel-track');
  const counter = document.getElementById('carousel-counter');
  if (!trackEl) return;
  CAROUSEL.index = idx;
  trackEl.style.transform = `translateX(-${idx * 100}%)`;
  if (counter) counter.textContent = `${idx + 1} / ${CAROUSEL.items.length}`;
  document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  document.querySelectorAll('.gallery-thumb').forEach((d, i) => d.classList.toggle('active', i === idx));
  // Auto-scroll del thumb activo dentro del contenedor de thumbs (sin afectar
  // el scroll vertical de la página).
  const thumbsWrap = document.getElementById('gallery-thumbs');
  const activeThumb = thumbsWrap?.querySelector('.gallery-thumb.active');
  if (thumbsWrap && activeThumb) {
    const wrapRect = thumbsWrap.getBoundingClientRect();
    const thumbRect = activeThumb.getBoundingClientRect();
    const offsetWithin = thumbRect.left - wrapRect.left + thumbsWrap.scrollLeft;
    const targetLeft = offsetWithin - (wrapRect.width / 2) + (thumbRect.width / 2);
    thumbsWrap.scrollTo({ left: targetLeft, behavior: 'smooth' });
  }
}

function bindCarouselSwipe(el) {
  let startX = 0, dx = 0, dragging = false;
  el.addEventListener('touchstart', e => {
    dragging = true; startX = e.touches[0].clientX; dx = 0;
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (!dragging) return;
    dx = e.touches[0].clientX - startX;
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(dx) > 40) goCarousel(dx < 0 ? +1 : -1);
  });
}


function renderRelated(product) {
  const related = getRelated(product, 12);
  const grid    = document.getElementById('related-grid');
  const title   = document.getElementById('related-title');

  if (!related.length) {
    document.getElementById('related-section').style.display = 'none';
    return;
  }

  const hasCustom = Array.isArray(product.related_ids) && product.related_ids.length;
  title.textContent = hasCustom
    ? 'Productos recomendados'
    : `Más herramientas de ${getCatLabel(primaryCat(product))}`;

  grid.innerHTML = related.map(p => `
    <a href="producto.html?id=${p.id}" class="related-card">
      <img src="${p.img}" alt="${p.name}" loading="lazy">
      <div class="related-card-body">
        <div class="related-card-name">${p.name}</div>
        <div class="related-card-cat">${getCatLabel(primaryCat(p))}</div>
      </div>
    </a>
  `).join('');

  gsap.set('.related-card', { opacity: 0, y: 20 });
  gsap.to('.related-card', {
    opacity: 1, y: 0, stagger: 0.07, duration: 0.5, ease: 'power2.out',
    clearProps: 'all',
    scrollTrigger: { trigger: '#related-section', start: 'top 85%', once: true }
  });
}

function initAnimations() {
  const HERO_ELS = [
    '.carousel', '.product-hero-cat', '.product-hero-name',
    '.product-hero-desc', '.product-hero-cta > *', '.breadcrumb'
  ];

  function forceProductVisible() {
    gsap.set(HERO_ELS, { clearProps: 'all' });
  }

  const tl = gsap.timeline({
    defaults: { ease: 'power2.out', clearProps: 'all' },
    onComplete: forceProductVisible
  });
  tl.from('.carousel',              { opacity: 0, scale: 0.96, duration: 0.7 })
    .from('.product-hero-cat',      { opacity: 0, x: -16, duration: 0.5 }, '-=0.4')
    .from('.product-hero-name',     { opacity: 0, y: 20, duration: 0.6 }, '-=0.3')
    .from('.product-hero-desc',     { opacity: 0, y: 16, duration: 0.5 }, '-=0.4')
    .from('.product-hero-cta > *',  { opacity: 0, y: 12, stagger: 0.1, duration: 0.4 }, '-=0.3');

  gsap.from('.breadcrumb', { opacity: 0, y: -8, duration: 0.5, ease: 'power2.out', clearProps: 'all' });

  document.addEventListener('visibilitychange', function onFocus() {
    if (!document.hidden) {
      tl.progress(1);
      forceProductVisible();
      document.removeEventListener('visibilitychange', onFocus);
    }
  });

  // Section title above related grid
  gsap.set('.related-section .section-title', { opacity: 0, y: 20 });
  gsap.to('.related-section .section-title', {
    opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', clearProps: 'all',
    scrollTrigger: { trigger: '.related-section', start: 'top 85%', once: true }
  });
}

function initPageTransitions() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
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

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  initPageTransitions();
  if (typeof loadDataFromSupabase === 'function') {
    try { await loadDataFromSupabase(); } catch (e) { /* keep fallback */ }
  }
  renderProduct();
  gsap.delayedCall(0.05, initAnimations);
});
