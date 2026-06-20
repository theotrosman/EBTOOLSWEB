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
  document.getElementById('breadcrumb-cat').textContent  = getCatLabel(product.cat);
  document.getElementById('breadcrumb-name').textContent = product.name;

  // Hero content
  const img = document.getElementById('product-img');
  img.src = product.img;
  img.alt = product.name;

  document.getElementById('product-cat').textContent  = getCatLabel(product.cat);
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-desc').textContent = product.desc;

  // WhatsApp links
  const waLink = waMsg(product.name);
  document.getElementById('product-wa-btn').href = waLink;
  document.getElementById('wa-float-link').href  = waLink;
  document.getElementById('cta-wa-btn').href     = waLink;

  // Related
  renderRelated(product);
}

function renderRelated(product) {
  const related = getRelated(product, 4);
  const grid    = document.getElementById('related-grid');
  const title   = document.getElementById('related-title');

  if (!related.length) {
    document.getElementById('related-section').style.display = 'none';
    return;
  }

  title.textContent = `Más herramientas de ${getCatLabel(product.cat)}`;

  grid.innerHTML = related.map(p => `
    <a href="producto.html?id=${p.id}" class="related-card">
      <img src="${p.img}" alt="${p.name}" loading="lazy">
      <div class="related-card-body">
        <div class="related-card-name">${p.name}</div>
        <div class="related-card-cat">${getCatLabel(p.cat)}</div>
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
    '.product-hero-img img', '.product-hero-cat', '.product-hero-name',
    '.product-hero-desc', '.product-hero-cta > *', '.breadcrumb'
  ];

  function forceProductVisible() {
    gsap.set(HERO_ELS, { clearProps: 'all' });
  }

  const tl = gsap.timeline({
    defaults: { ease: 'power2.out', clearProps: 'all' },
    onComplete: forceProductVisible
  });
  tl.from('.product-hero-img img',  { opacity: 0, scale: 0.94, duration: 0.7 })
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
