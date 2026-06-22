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

  // Hero content
  const img = document.getElementById('product-img');
  img.src = product.img;
  img.alt = product.name;

  document.getElementById('product-cat').textContent  = productCatLabels(product).join(' · ');
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-desc').textContent = product.desc;

  // WhatsApp links
  const waLink = waMsg(product.name);
  document.getElementById('product-wa-btn').href = waLink;
  document.getElementById('wa-float-link').href  = waLink;
  document.getElementById('cta-wa-btn').href     = waLink;

  // Gallery (extra images)
  renderGallery(product);

  // Videos
  renderVideos(product);

  // Related
  renderRelated(product);
}

function renderGallery(product) {
  const allImages = [product.img, ...(product.images || [])].filter(url => url && url.trim());
  const thumbsEl = document.getElementById('gallery-thumbs');
  if (!thumbsEl || allImages.length <= 1) return;

  thumbsEl.innerHTML = allImages.map((url, i) => {
    const safeUrl = url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    return `<button class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="switchGalleryImg('${safeUrl}', this)" aria-label="Imagen ${i + 1}">
      <img src="${safeUrl}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'">
    </button>`;
  }).join('');
}

function switchGalleryImg(url, btn) {
  const mainImg = document.getElementById('product-img');
  if (mainImg) {
    gsap.to(mainImg, {
      opacity: 0, scale: 0.96, duration: 0.15, ease: 'power2.in',
      onComplete() {
        mainImg.src = url;
        gsap.to(mainImg, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out', clearProps: 'all' });
      }
    });
  }
  document.querySelectorAll('.gallery-thumb').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
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
