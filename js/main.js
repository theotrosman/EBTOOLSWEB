/* ===== EBTOOLS - MAIN JS ===== */

const WA_NUMBER = '5491171349389';
const WA_BASE = `https://wa.me/${WA_NUMBER}?text=`;

// ===== PRODUCTS DATA =====
const PRODUCTS = [
  // Construcción
  { id:1, name:'Abrochadoras Manuales', cat:'construccion', img:'https://ebtools.com.ar/wp-content/uploads/2017/07/116-1024x1024.jpg', desc:'Abrochadoras de alta resistencia para aplicaciones en construcción.' },
  { id:2, name:'Gaviones', cat:'construccion', img:'https://ebtools.com.ar/wp-content/uploads/2017/12/Gavion1-1024x1024.jpg', desc:'Gaviones metálicos para contención y paisajismo.' },
  { id:3, name:'Revocadoras Neumáticas', cat:'construccion', img:'https://ebtools.com.ar/wp-content/uploads/2021/01/50-1024x1024.jpg', desc:'Máquinas revocadoras neumáticas para acabados de paredes.' },
  { id:4, name:'Abrochadoras Neumáticas', cat:'construccion', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/93.-1024x1024.jpg', desc:'Abrochadoras neumáticas de alta velocidad y precisión.' },
  // Gastronomía
  { id:5, name:'Clipeadoras Manual y Neumática', cat:'gastronomia', img:'https://ebtools.com.ar/wp-content/uploads/2022/03/WhatsApp-Image-2022-03-22-at-14.05.06-3-1024x1024.jpeg', desc:'Clipeadoras para cierre de embutidos en manual y neumático.' },
  { id:6, name:'Pinza Abrochadora para Tripa', cat:'gastronomia', img:'https://ebtools.com.ar/wp-content/uploads/2017/07/116-1024x1024.jpg', desc:'Pinza para abrochadoras de tripa de salamín y chorizo.' },
  { id:7, name:'Cortadora de Papas Bastón 3 Cortes', cat:'gastronomia', img:'https://ebtools.com.ar/wp-content/uploads/2025/12/WhatsApp_Image_2025-10-31_at_11.08.32-removebg-preview-4.png', desc:'Cortadora gastronómica con 3 tipos de corte para papas bastón.' },
  { id:8, name:'Embutidora Manual Horizontal 3L', cat:'gastronomia', img:'https://ebtools.com.ar/wp-content/uploads/2025/12/WhatsApp-Image-2025-12-03-at-11.59.47.jpeg', desc:'Embutidora manual horizontal de 3 litros de capacidad.' },
  { id:9, name:'Multiprocesadora Industrial 5 Discos', cat:'gastronomia', img:'https://ebtools.com.ar/wp-content/uploads/2025/12/WhatsApp-Image-2025-12-03-at-12.32.41-1024x725.jpeg', desc:'Procesadora industrial con 5 discos intercambiables.' },
  { id:10, name:'Embutidoras Manual y Eléctrica', cat:'gastronomia', img:'https://ebtools.com.ar/wp-content/uploads/2025/03/3-y-5L-1024x1024.jpg', desc:'Embutidoras de 3 y 5 litros, manual y eléctrica.' },
  { id:11, name:'Atadora de Embutidos Manual', cat:'gastronomia', img:'https://ebtools.com.ar/wp-content/uploads/2022/08/Atadora-Chorizos-1024x1024.jpg', desc:'Atadora manual para embutidos y chorizos.' },
  { id:12, name:'Cortadora de Fiambre Eléctrica 300mm', cat:'gastronomia', img:'https://ebtools.com.ar/wp-content/uploads/2025/12/WhatsApp-Image-2025-12-03-at-11.14.45-3.jpeg', desc:'Cortadora eléctrica de fiambres de 300mm de disco.' },
  { id:13, name:'Picadora de Carne Eléctrica N32', cat:'gastronomia', img:'https://ebtools.com.ar/wp-content/uploads/2025/12/WhatsApp-Image-2025-11-03-at-13.30.07.jpeg', desc:'Picadora eléctrica de carne N32 de alta producción.' },
  { id:14, name:'Clipeadora para Bolsas y Redes', cat:'gastronomia', img:'https://ebtools.com.ar/wp-content/uploads/2025/12/Sin-titulo-1-1024x1024.jpg', desc:'Clipeadora para cerrado de bolsas y redes.' },
  // Agro
  { id:15, name:'Tijeras de Poda', cat:'agro', img:'https://ebtools.com.ar/wp-content/uploads/2021/01/4a-1024x1024.jpg', desc:'Tijeras de poda profesionales para viña y frutales.' },
  { id:16, name:'Atadoras Tutoreadoras', cat:'agro', img:'https://ebtools.com.ar/wp-content/uploads/2020/12/33-1024x1024.jpg', desc:'Máquinas atadoras para tutoreo de viñas y hortalizas.' },
  { id:17, name:'Tijera y Navaja para Injertos', cat:'agro', img:'https://ebtools.com.ar/wp-content/uploads/2021/07/injertos-1024x1024.jpg', desc:'Herramientas especializadas para injertos de precisión.' },
  { id:18, name:'Serruchos de Poda', cat:'agro', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/serrucho-1-1024x1024.jpg', desc:'Serruchos curvos para poda de ramas.' },
  { id:19, name:'Pértigas Extensibles', cat:'agro', img:'https://ebtools.com.ar/wp-content/uploads/2022/03/palo3-1024x1024.jpg', desc:'Pértigas telescópicas para cosecha en altura.' },
  { id:20, name:'Tijera Poda Extensible en Altura', cat:'agro', img:'https://ebtools.com.ar/wp-content/uploads/2022/08/WhatsApp-Image-2022-06-01-at-10.08.33-AM-1.jpeg', desc:'Tijera de poda y recolección telescópica extensible.' },
  // Neumáticas
  { id:21, name:'Llave de Impacto Neumática', cat:'neumaticas', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/2-1-1024x1024.jpg', desc:'Llave pistola de impacto neumática de alto torque.' },
  { id:22, name:'Grasera Engrasadora Neumática', cat:'neumaticas', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/grasera7-1024x1024.jpg', desc:'Engrasadora neumática y manual de alto rendimiento.' },
  { id:23, name:'Kit Aire Comprimido Completo', cat:'neumaticas', img:'https://ebtools.com.ar/wp-content/uploads/2021/01/kit-completo-1-1024x1024.jpg', desc:'Kit completo de accesorios para aire comprimido.' },
  { id:24, name:'Martillo Demoledor Neumático', cat:'neumaticas', img:'https://ebtools.com.ar/wp-content/uploads/2021/03/martillon-1024x1024.jpg', desc:'Martillo demoledor neumático de alta percusión.' },
  { id:25, name:'Amoladora Recta Neumática', cat:'neumaticas', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/amoladora2-1024x1024.jpg', desc:'Amoladora recta neumática para trabajos de precisión.' },
  { id:26, name:'Remachadora Pop Neumática', cat:'neumaticas', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/Remachadora-1024x1024.jpg', desc:'Remachadora pop neumática para estructuras metálicas.' },
  { id:27, name:'Pistolas para Sopletear', cat:'neumaticas', img:'https://ebtools.com.ar/wp-content/uploads/2021/01/kit2-1024x1024.jpg', desc:'Pistolas de soplado para limpieza por aire.' },
  { id:28, name:'Amoladora Cortadora Neumática', cat:'neumaticas', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/amoladora2-2-1024x1024.jpg', desc:'Amoladora cortadora angular neumática.' },
  { id:29, name:'Llave Impacto Camión Profesional', cat:'neumaticas', img:'https://ebtools.com.ar/wp-content/uploads/2021/09/LLIC-3-1024x1024.jpg', desc:'Llave de impacto profesional para camiones y maquinaria pesada.' },
  { id:30, name:'Lijadora Orbital Neumática 150mm', cat:'neumaticas', img:'https://ebtools.com.ar/wp-content/uploads/2022/08/Lijadora2-1024x1024.jpg', desc:'Lijadora roto-orbital neumática de 150mm.' },
  // Sopletes
  { id:31, name:'Pistola Soplete para Arenar', cat:'sopletes', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/PistolaArena-copy-1024x1024.jpg', desc:'Pistola soplete para arenado industrial.' },
  { id:32, name:'Pistola Pintura Succión', cat:'sopletes', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/PistolaAire1-1-1024x1024.jpg', desc:'Pistola soplete por succión para pintura automotriz.' },
  { id:33, name:'Pistola Soplete Gravedad', cat:'sopletes', img:'https://ebtools.com.ar/wp-content/uploads/2021/07/pistolavaso1-1024x1024.jpg', desc:'Pistola de pintura por gravedad de alta atomización.' },
  { id:34, name:'Pistola Pintura Tolva 5L', cat:'sopletes', img:'https://ebtools.com.ar/wp-content/uploads/2021/03/Pistola-Pintar-Aluminio1-1-1024x1024.jpg', desc:'Pistola tolva de 5 litros para grandes superficies.' },
  // Filtros
  { id:35, name:'Unidad Filtro Compresor', cat:'filtros', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/FilrtoAire1-1024x1024.jpg', desc:'Unidad de filtro para aire comprimido.' },
  { id:36, name:'Manómetro Medidor de Presión', cat:'filtros', img:'https://ebtools.com.ar/wp-content/uploads/2022/03/M2-1024x1024.jpg', desc:'Manómetro neumático medidor de presión.' },
  { id:37, name:'Filtro Trampa de Agua', cat:'filtros', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/filtro-1024x1024.jpg', desc:'Filtro trampa de agua para líneas de aire.' },
  { id:38, name:'Mini Lubricador', cat:'filtros', img:'https://ebtools.com.ar/wp-content/uploads/2021/07/WhatsApp-Image-2021-04-28-at-11.10.09-AM.jpeg', desc:'Mini lubricador para sistemas neumáticos.' },
  { id:39, name:'Acoples Rápidos', cat:'filtros', img:'https://ebtools.com.ar/wp-content/uploads/2021/07/acoples-1024x1024.jpg', desc:'Acoples rápidos para conexiones de aire.' },
  { id:40, name:'Pico para Inflar', cat:'filtros', img:'https://ebtools.com.ar/wp-content/uploads/2022/08/Pico-inflador-1024x1024.jpg', desc:'Pico para inflar neumáticos y objetos.' },
  // Repuestos
  { id:41, name:'Presostato 380V', cat:'repuestos', img:'https://ebtools.com.ar/wp-content/uploads/2021/09/Preso-4-380-1024x1024.jpg', desc:'Presostato trifásico 380V para compresores industriales.' },
  { id:42, name:'Regulador Caudal Aire 1/4"', cat:'repuestos', img:'https://ebtools.com.ar/wp-content/uploads/2022/03/RR1-1024x1024.jpg', desc:'Regulador de caudal de aire 1/4 para compresores.' },
  { id:43, name:'Válvulas Anti Retorno', cat:'repuestos', img:'https://ebtools.com.ar/wp-content/uploads/2022/08/WhatsApp-Image-2022-05-16-at-16.25.46-1-1024x1024.jpeg', desc:'Válvulas anti retorno para líneas de presión.' },
  { id:44, name:'Regulador de Aire Compresor', cat:'repuestos', img:'https://ebtools.com.ar/wp-content/uploads/2022/08/R-1024x1024.jpg', desc:'Regulador de presión de aire para compresores.' },
  { id:45, name:'Manómetro', cat:'repuestos', img:'https://ebtools.com.ar/wp-content/uploads/2024/01/Manometro-solo-1024x1024.jpg', desc:'Manómetro de presión para compresores.' },
  { id:46, name:'Presostato 220V', cat:'repuestos', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/Persostato4-2-1024x1024.jpg', desc:'Presostato monofásico 220V para compresores.' },
  { id:47, name:'Base Presostato con Regulador', cat:'repuestos', img:'https://ebtools.com.ar/wp-content/uploads/2022/03/BP2-1024x1024.jpg', desc:'Base presostato con regulador integrado.' },
  { id:48, name:'Válvula de Seguridad Calibrada', cat:'repuestos', img:'https://ebtools.com.ar/wp-content/uploads/2022/08/V5-1024x1024.jpg', desc:'Válvula de seguridad calibrada para compresores.' },
  { id:49, name:'Válvula de Salida Aire', cat:'repuestos', img:'https://ebtools.com.ar/wp-content/uploads/2022/08/V2-1024x1024.jpg', desc:'Válvula de salida de aire para compresores.' },
  // Mangueras
  { id:50, name:'Mangueras Espiraladas', cat:'mangueras', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/manguera3-1024x1024.jpg', desc:'Mangueras espiraladas retráctiles para aire comprimido.' },
  { id:51, name:'Manguera PVC Alta Presión', cat:'mangueras', img:'https://ebtools.com.ar/wp-content/uploads/2021/02/56-1024x1024.jpg', desc:'Manguera PVC de alta presión para compresor.' },
  { id:52, name:'Pico Inflador con Manómetro', cat:'mangueras', img:'https://ebtools.com.ar/wp-content/uploads/2021/01/kit4-1024x1024.jpg', desc:'Pico inflador con manómetro para neumáticos.' },
  { id:53, name:'Manómetro para Neumáticos', cat:'mangueras', img:'https://ebtools.com.ar/wp-content/uploads/2022/03/M-1024x1024.jpg', desc:'Manómetro medidor de presión para neumáticos.' },
];

const CATEGORIES = {
  all: { label: 'Todos', count: PRODUCTS.length },
  construccion: { label: 'Construcción', count: PRODUCTS.filter(p=>p.cat==='construccion').length },
  gastronomia: { label: 'Gastronomía', count: PRODUCTS.filter(p=>p.cat==='gastronomia').length },
  agro: { label: 'Agro', count: PRODUCTS.filter(p=>p.cat==='agro').length },
  neumaticas: { label: 'Neumáticas', count: PRODUCTS.filter(p=>p.cat==='neumaticas').length },
  sopletes: { label: 'Sopletes', count: PRODUCTS.filter(p=>p.cat==='sopletes').length },
  filtros: { label: 'Filtros y Acoples', count: PRODUCTS.filter(p=>p.cat==='filtros').length },
  repuestos: { label: 'Repuestos', count: PRODUCTS.filter(p=>p.cat==='repuestos').length },
  mangueras: { label: 'Mangueras', count: PRODUCTS.filter(p=>p.cat==='mangueras').length },
};

const CAT_ICONS = {
  all: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  construccion: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>`,
  gastronomia: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>`,
  agro: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12c0-2.76 1.12-5.26 2.93-7.07M12 2v10"/></svg>`,
  neumaticas: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  sopletes: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12H3M7.05 7.05L5.64 5.64M12 5V3M16.95 7.05l1.41-1.41M19 12h2M16.95 16.95l1.41 1.41M12 19v2M7.05 16.95l-1.41 1.41"/><circle cx="12" cy="12" r="4"/></svg>`,
  filtros: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>`,
  repuestos: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M4.93 4.93A10 10 0 0 0 19.07 19.07"/></svg>`,
  mangueras: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M12 3v18M3 12h18"/></svg>`,
};

// ===== WA MESSAGE BUILDER =====
function waLink(productName) {
  const msg = encodeURIComponent(`Hola! Me interesa el producto: ${productName}. ¿Me podés dar más información?`);
  return `${WA_BASE}${msg}`;
}

// ===== RENDER CATEGORIES =====
function renderCategories() {
  const grid = document.getElementById('categories-grid');
  const catKeys = Object.keys(CATEGORIES).filter(k => k !== 'all');
  grid.innerHTML = catKeys.map(key => `
    <div class="category-card reveal" data-cat="${key}" onclick="filterProducts('${key}')">
      <div class="cat-icon">${CAT_ICONS[key] || CAT_ICONS.all}</div>
      <div class="cat-name">${CATEGORIES[key].label}</div>
      <div class="cat-count">${CATEGORIES[key].count} producto${CATEGORIES[key].count !== 1 ? 's' : ''}</div>
    </div>
  `).join('');
}

// ===== RENDER PRODUCTS =====
let currentFilter = 'all';
let showAll = false;
const INITIAL_COUNT = 12;

function renderProducts() {
  const grid = document.getElementById('products-grid');
  const filtered = currentFilter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.cat === currentFilter);
  const toShow = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);

  grid.innerHTML = toShow.map(p => `
    <div class="product-card reveal" data-cat="${p.cat}">
      <div class="product-img-wrapper">
        <img src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23f5f5f5%22 width=%22200%22 height=%22200%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23ccc%22 font-size=%2240%22>📦</text></svg>'">
        <span class="product-category-tag">${CATEGORIES[p.cat]?.label || p.cat}</span>
      </div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <a href="${waLink(p.name)}" target="_blank" class="btn-product-wa">
          ${WA_ICON_SMALL} Consultar por WhatsApp
        </a>
      </div>
    </div>
  `).join('');

  // Show/hide load more
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    const hasMore = filtered.length > INITIAL_COUNT && !showAll;
    loadMoreBtn.style.display = hasMore ? 'inline-flex' : 'none';
    loadMoreBtn.textContent = `Ver los ${filtered.length - INITIAL_COUNT} productos restantes`;
  }

  // Animate new cards
  anime({
    targets: '.product-card',
    opacity: [0, 1],
    translateY: [20, 0],
    delay: anime.stagger(40),
    duration: 400,
    easing: 'easeOutCubic'
  });
}

const WA_ICON_SMALL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

// ===== FILTER =====
function filterProducts(cat) {
  currentFilter = cat;
  showAll = false;

  // Update filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });

  // Update category cards
  document.querySelectorAll('.category-card').forEach(card => {
    card.classList.toggle('active', card.dataset.cat === cat);
  });

  renderProducts();

  // Scroll to products
  document.getElementById('productos').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== NAVBAR =====
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  toggle?.addEventListener('click', () => {
    menu.classList.toggle('open');
    toggle.classList.toggle('open');
  });

  document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => menu.classList.remove('open'));
  });
}

// ===== HERO 3D PARALLAX =====
function initHeroParallax() {
  const wrapper = document.querySelector('.hero-product-wrapper');
  const card = document.querySelector('.hero-product-card');
  const glow = document.querySelector('.hero-product-glow');
  if (!wrapper || !card) return;

  let bounds;
  let rafId;
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;

  const updateBounds = () => { bounds = wrapper.getBoundingClientRect(); };
  window.addEventListener('resize', updateBounds, { passive: true });
  updateBounds();

  function lerp(a, b, t) { return a + (b - a) * t; }

  function animate() {
    currentX = lerp(currentX, targetX, 0.08);
    currentY = lerp(currentY, targetY, 0.08);
    card.style.transform = `rotateY(${currentX}deg) rotateX(${-currentY}deg)`;
    if (glow) {
      const gx = 50 + currentX * 1.5;
      const gy = 50 + currentY * 1.5;
      glow.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(244,123,32,0.18) 0%, transparent 65%)`;
    }
    rafId = requestAnimationFrame(animate);
  }
  animate();

  wrapper.addEventListener('mousemove', (e) => {
    if (!bounds) updateBounds();
    const x = (e.clientX - bounds.left) / bounds.width - 0.5;
    const y = (e.clientY - bounds.top) / bounds.height - 0.5;
    targetX = x * 14;
    targetY = y * 10;
  });

  wrapper.addEventListener('mouseleave', () => {
    targetX = 0;
    targetY = 0;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else animate();
  });
}

// ===== DYNAMIC TEXT =====
function initDynamicText() {
  const items = document.querySelectorAll('.hero-dynamic-text .text-item');
  if (!items.length) return;
  let current = 0;

  function next() {
    const prev = current;
    current = (current + 1) % items.length;

    anime({
      targets: items[prev],
      opacity: 0,
      translateY: -16,
      duration: 300,
      easing: 'easeInCubic',
      complete: () => { items[prev].classList.remove('active'); items[prev].style.transform = 'translateY(16px)'; }
    });

    setTimeout(() => {
      items[current].classList.add('active');
      anime({
        targets: items[current],
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 400,
        easing: 'easeOutCubic'
      });
    }, 200);
  }

  items[0].classList.add('active');
  anime({ targets: items[0], opacity: [0,1], translateY: [16,0], duration: 500, easing: 'easeOutCubic' });
  setInterval(next, 2800);
}

// ===== HERO ENTRANCE =====
function heroEntrance() {
  anime.timeline({ easing: 'easeOutCubic' })
    .add({ targets: '.hero-badge', opacity: [0,1], translateY: [20,0], duration: 600 })
    .add({ targets: '.hero-title', opacity: [0,1], translateY: [30,0], duration: 700 }, '-=300')
    .add({ targets: '.hero-subtitle', opacity: [0,1], translateY: [20,0], duration: 600 }, '-=400')
    .add({ targets: '.hero-dynamic', opacity: [0,1], translateY: [16,0], duration: 500 }, '-=400')
    .add({ targets: '.hero-buttons .btn-primary', opacity: [0,1], translateY: [16,0], duration: 500 }, '-=300')
    .add({ targets: '.hero-buttons .btn-secondary', opacity: [0,1], translateY: [16,0], duration: 500 }, '-=400')
    .add({ targets: '.hero-product-card', opacity: [0,1], scale: [0.88,1], duration: 700, easing: 'easeOutBack' }, '-=500')
    .add({ targets: '.hero-float--products', opacity: [0,1], translateX: [-20,0], duration: 500 }, '-=300')
    .add({ targets: '.hero-float--categories', opacity: [0,1], translateX: [20,0], duration: 500 }, '-=450');
}

// ===== COUNTER ANIMATION =====
function animateCounters() {
  document.querySelectorAll('[data-counter]').forEach(el => {
    const target = parseInt(el.dataset.counter);
    const suffix = el.dataset.suffix || '';
    anime({
      targets: el,
      innerHTML: [0, target],
      round: 1,
      duration: 1800,
      easing: 'easeOutExpo',
      update: function(anim) {
        el.innerHTML = Math.round(anim.animations[0].currentValue) + suffix;
      }
    });
  });
}

// ===== SCROLL REVEAL =====
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseInt(el.dataset.delay || 0);
        anime({
          targets: el,
          opacity: [0, 1],
          translateY: [24, 0],
          duration: 550,
          delay,
          easing: 'easeOutCubic',
          complete: () => el.classList.add('revealed')
        });
        observer.unobserve(el);

        // trigger counters if stats section
        if (el.closest('.stats-bar') || el.closest('.about-section')) {
          animateCounters();
        }
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach((el, i) => {
    observer.observe(el);
  });
}

// ===== FILTER BUTTONS BUILD =====
function buildFilterButtons() {
  const container = document.getElementById('products-filter');
  if (!container) return;
  container.innerHTML = Object.entries(CATEGORIES).map(([key, val]) => `
    <button class="filter-btn ${key === 'all' ? 'active' : ''}" data-cat="${key}" onclick="filterProducts('${key}')">
      ${val.label} <span style="opacity:0.6;font-weight:400">${val.count}</span>
    </button>
  `).join('');
}

// ===== STAGGER CATEGORY CARDS =====
function staggerCategoryCards() {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      anime({
        targets: '.category-card',
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(60),
        duration: 500,
        easing: 'easeOutCubic'
      });
      observer.disconnect();
    }
  }, { threshold: 0.1 });
  const grid = document.getElementById('categories-grid');
  if (grid) observer.observe(grid);
}

// ===== ABOUT STATS ANIMATE =====
function initAboutStats() {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      anime({
        targets: '.about-stat-card',
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(80),
        duration: 550,
        easing: 'easeOutCubic'
      });
      animateCounters();
      observer.disconnect();
    }
  }, { threshold: 0.2 });
  const about = document.querySelector('.about-section');
  if (about) observer.observe(about);
}

// ===== STATS BAR ANIMATE =====
function initStatsBars() {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      anime({
        targets: '.stat-item',
        opacity: [0, 1],
        translateY: [10, 0],
        delay: anime.stagger(100),
        duration: 500,
        easing: 'easeOutCubic'
      });
      animateCounters();
      observer.disconnect();
    }
  }, { threshold: 0.5 });
  const bar = document.querySelector('.stats-bar');
  if (bar) observer.observe(bar);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  renderCategories();
  buildFilterButtons();
  renderProducts();
  initScrollReveal();
  staggerCategoryCards();
  initAboutStats();
  initStatsBars();

  // Delay hero entrance slightly
  setTimeout(() => {
    heroEntrance();
    initDynamicText();
    initHeroParallax();
  }, 100);
});
