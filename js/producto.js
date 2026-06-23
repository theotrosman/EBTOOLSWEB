/* ===== EBTOOLS — PRODUCT PAGE JS ===== */
gsap.registerPlugin(ScrollTrigger);

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
  document.getElementById('product-desc').textContent = product.desc;

  // WhatsApp links
  const waLink = waMsg(product.name);
  document.getElementById('product-wa-btn').href = waLink;
  document.getElementById('wa-float-link').href  = waLink;
  document.getElementById('cta-wa-btn').href     = waLink;

  // Carrusel + thumbnails
  initCarousel(product);

  // Videos
  renderVideos(product);

  // Related
  renderRelated(product);
}

/* ========== CAROUSEL ========== */
const CAROUSEL = { images: [], index: 0, animating: false };

function initCarousel(product) {
  const wrapEl   = document.getElementById('carousel');
  const trackEl  = document.getElementById('carousel-track');
  const dotsEl   = document.getElementById('carousel-dots');
  const thumbsEl = document.getElementById('gallery-thumbs');
  const counterEl= document.getElementById('carousel-counter');
  const prevBtn  = document.getElementById('carousel-prev');
  const nextBtn  = document.getElementById('carousel-next');
  if (!wrapEl || !trackEl) return;

  const images = [product.img, ...(product.images || [])]
    .filter(url => url && url.trim());
  CAROUSEL.images = images;
  CAROUSEL.index = 0;

  if (!images.length) { wrapEl.style.display = 'none'; return; }

  // Slides
  trackEl.innerHTML = images.map((url, i) => `
    <div class="carousel-slide" data-idx="${i}">
      <img src="${escAttr(url)}" alt="${escAttr(product.name)} — imagen ${i + 1}"
           loading="${i === 0 ? 'eager' : 'lazy'}"
           onerror="this.style.opacity='0'">
    </div>
  `).join('');

  // Dots + thumbs solo si hay más de 1 imagen
  const showNav = images.length > 1;
  wrapEl.classList.toggle('has-multiple', showNav);

  if (dotsEl) {
    dotsEl.innerHTML = showNav
      ? images.map((_, i) =>
          `<button class="carousel-dot ${i === 0 ? 'active' : ''}" data-go="${i}" aria-label="Imagen ${i + 1}"></button>`
        ).join('')
      : '';
  }

  if (thumbsEl) {
    thumbsEl.innerHTML = showNav
      ? images.map((url, i) =>
          `<button class="gallery-thumb ${i === 0 ? 'active' : ''}" data-go="${i}" aria-label="Imagen ${i + 1}">
            <img src="${escAttr(url)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'">
          </button>`).join('')
      : '';
  }

  if (counterEl) counterEl.textContent = `1 / ${images.length}`;
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

  // Teclado (← →) cuando el carrusel está en pantalla
  document.addEventListener('keydown', e => {
    if (!showNav) return;
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'ArrowLeft')  goCarousel(-1);
    if (e.key === 'ArrowRight') goCarousel(+1);
  });

  // Swipe en mobile
  bindCarouselSwipe(trackEl);

  goCarouselTo(0); // posiciona el track sin animar
}

function escAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function goCarousel(delta) {
  if (!CAROUSEL.images.length) return;
  const next = (CAROUSEL.index + delta + CAROUSEL.images.length) % CAROUSEL.images.length;
  goCarouselTo(next);
}

function goCarouselTo(idx) {
  const trackEl = document.getElementById('carousel-track');
  const counter = document.getElementById('carousel-counter');
  if (!trackEl) return;
  CAROUSEL.index = idx;
  trackEl.style.transform = `translateX(-${idx * 100}%)`;
  if (counter) counter.textContent = `${idx + 1} / ${CAROUSEL.images.length}`;
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

function renderVideos(product) {
  const videos = product.videos || [];
  if (!videos.length) return;
  const section = document.getElementById('videos-section');
  const grid    = document.getElementById('videos-grid');
  if (!section || !grid) return;
  section.style.display = '';
  grid.innerHTML = videos.map(url => {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return `<div class="video-embed-wrap">
        <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
        </iframe>
      </div>`;
    }
    return `<a href="${url}" target="_blank" rel="noopener" class="video-link-card">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="22" height="22"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Ver video
    </a>`;
  }).join('');
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

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  if (typeof loadDataFromSupabase === 'function') {
    try { await loadDataFromSupabase(); } catch (e) { /* keep fallback */ }
  }
  renderProduct();
  gsap.delayedCall(0.05, initAnimations);
});
