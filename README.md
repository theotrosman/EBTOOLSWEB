# EBTOOLS — Sitio web y catálogo

Sitio web y catálogo de productos de **EBTOOLS**, importadores y distribuidores de herramientas y equipamiento industrial en Argentina — neumáticas, construcción, agro, gastronomía y más.

---

## El proyecto

EBTOOLS necesitaba una presencia digital que transmitiera seriedad y facilitara el contacto con clientes. Se construyó un sitio completo: landing institucional, catálogo de productos con filtros, y página de detalle por producto — todo conectado a una base de datos en vivo para que el equipo pueda actualizar el catálogo sin tocar código.

---

## Diseño

El sitio sigue una filosofía de diseño editorial e industrial: tipografía grande con tracking negativo, espaciado generoso entre secciones, paleta reducida (negro, blanco, naranja EBTOOLS). Cada detalle apunta a que el usuario entienda qué es el negocio y cómo contactar en el menor tiempo posible.

Algunos detalles de craft:
- **Cards con elevación real** — sombra + borde naranja sutil al hover, la imagen escala levemente, el nombre del producto vira a naranja. El hover comunica "esto es clickeable" sin gritarlo.
- **Sticky image en la página de producto** — mientras el usuario lee la descripción, la imagen del producto queda fija a la izquierda. Patrón clásico de e-commerce que hace la experiencia más cómoda.
- **Watermark numbers en "Por qué elegirnos"** — números 01–02–03–04 en enorme detrás de cada card, visibles al hover. Detalle que sorprende pero se entiende de inmediato.
- **Categorías con frosted glass** — las etiquetas de categoría sobre las fotos de producto usan `backdrop-filter: blur` para flotar limpiamente sobre cualquier imagen.
- **Transiciones de página** — fade-out/fade-in entre páginas, scroll suave a secciones sin mostrar `#hash` en la URL.
- **Press feedback** — todos los botones, filtros y cards escalan levemente al presionar (`scale(0.97)`). Feedback instantáneo que hace el sitio sentir responsivo.
- **Videos en el carrusel** — los videos del producto (YouTube o archivo directo) se integran al carrusel de imágenes con un botón de play grande centrado, igual al patrón de YouTube. No hay sección separada de videos.
- **Easings custom** — se usan curvas `cubic-bezier` propias en lugar de los easings nativos del navegador, que son demasiado suaves para sentir intencional.

---

## Catálogo y filtros

- Buscador en tiempo real por nombre o categoría
- Filtros por categoría (primer nivel) y subcategoría (segundo nivel)
- Cada producto puede pertenecer a múltiples categorías y subcategorías
- Carrusel de imágenes + videos por producto
- Página de detalle con descripción, imágenes, videos y productos relacionados
- Sección de destacados en el hero de la landing, con orden configurable

---

## Backoffice (`/panel.html`)

Panel de administración con login, pensado para que cualquier persona del equipo pueda operar sin saber de desarrollo.

**Productos**
- Alta, edición y borrado de productos
- Subida de imágenes por drag & drop o URL
- Galería de imágenes adicionales y videos por producto
- Descripción corta y completa (soporta saltos de línea)
- Control de visibilidad (ocultar sin borrar)
- Etiqueta de color configurable (EN OFERTA, NUEVO, etc.)
- Avisos automáticos cuando un producto no tiene categoría o subcategoría asignada

**Categorías y subcategorías**
- Alta, edición y borrado
- Selector visual de íconos (SVG) para cada categoría
- Orden en el catálogo configurable (campo `sort`)
- Búsqueda por nombre de categoría/subcategoría **o por nombre de producto** — escribís un producto y ves en qué categorías aparece
- Filtro de subcategorías por categoría padre

**Destacados**
- Selector para elegir qué productos aparecen en el carrusel del hero
- Control del orden de aparición por número

---

## Contacto

- **WhatsApp:** +54 9 11 7134-9389
- **Instagram:** [@Ebtools](https://www.instagram.com/Ebtools)
- **MercadoLibre:** [EBTOOLS](https://www.mercadolibre.com.ar/pagina/elbahiense)

---

© EBTOOLS Herramientas — Importadores y distribuidores · Argentina.
