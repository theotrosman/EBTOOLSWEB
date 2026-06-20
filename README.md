# EBTOOLS — Sitio web y catálogo

Sitio web y catálogo de productos de **EBTOOLS**, importadores y distribuidores de herramientas y equipamiento industrial en Argentina (neumáticas, construcción, agro, gastronomía y más).

Es un sitio **estático** (HTML/CSS/JS sin framework ni build) con los datos en **Supabase**, e incluye un **backoffice** simple para que el equipo cargue productos, categorías e imágenes sin tocar código.

---

## ✨ Características

- **Landing + catálogo** con buscador, filtros por categoría y subcategoría, y página de detalle por producto.
- **Multi-categoría:** cada producto puede pertenecer a varias categorías y subcategorías.
- **Backoffice** (`/panel.html`) con login, pensado para personas que no saben de webs:
  - Alta/edición/borrado de **productos, categorías y subcategorías**.
  - **Subida de imágenes** por arrastrar y soltar (o pegando una URL).
  - **Selector visual de íconos** para las categorías (con opción avanzada de pegar un SVG propio).
  - **Importación masiva** de productos pegando un array JSON.
- **Animaciones** con GSAP (entrada del hero, ticker de rubros, scroll reveal).
- **Datos en vivo desde Supabase** con _fallback_ a datos incluidos: si la base no responde, el sitio igual muestra el catálogo.
- Contacto directo por **WhatsApp** y links a Instagram / MercadoLibre.

---

## 🧱 Stack

- **Frontend:** HTML, CSS y JavaScript _vanilla_ (sin build step).
- **Animaciones:** [GSAP](https://gsap.com/) + ScrollTrigger (vía CDN).
- **Backend / datos:** [Supabase](https://supabase.com/) — Postgres + Auth + Storage + Row Level Security.
- **Hosting:** [Vercel](https://vercel.com/) (deploy automático al hacer push a `master`).

---

## 📁 Estructura

```
EBTOOLSWEB/
├── index.html            # Home + catálogo
├── producto.html         # Página de detalle de un producto
├── panel.html            # Backoffice (acceso restringido)
├── schema.sql            # Script completo de Supabase (tablas, RLS, datos, storage)
├── assets/               # Logo, ícono, imágenes
├── css/
│   ├── styles.css        # Estilos del sitio público
│   └── panel.css         # Estilos del backoffice
└── js/
    ├── config.js         # URL y anon key de Supabase (públicas por diseño)
    ├── products-data.js  # Datos incluidos (fallback) de productos/categorías
    ├── supabase-data.js  # Carga de datos en vivo desde Supabase
    ├── main.js           # Lógica del home (catálogo, filtros, animaciones)
    ├── producto.js       # Lógica de la página de producto
    └── panel.js          # Lógica del backoffice (CRUD, imágenes, importación)
```

---

## 🗄️ Modelo de datos

Tres tablas en Supabase (ver `schema.sql`):

| Tabla           | Campos principales                                                        |
|-----------------|--------------------------------------------------------------------------|
| `categories`    | `key`, `label`, `icon` (SVG), `sort`                                      |
| `subcategories` | `key`, `cat` (→ categoría), `label`, `sort`                               |
| `products`      | `id`, `name`, `slug`, `cats[]`, `subcats[]`, `img`, `short`, `descr`, `sort`, `active` |

`cats` y `subcats` son arrays (un producto puede estar en varias), con índices GIN para filtrar rápido.

**Row Level Security:** lectura pública para todos; escritura solo para usuarios autenticados (el admin del backoffice).

---

## 🚀 Puesta en marcha

### 1. Clonar y servir localmente

Al ser estático, alcanza con cualquier servidor de archivos:

```bash
git clone https://github.com/theotrosman/EBTOOLSWEB.git
cd EBTOOLSWEB

# con Node:
npx serve .
# o con Python:
python -m http.server 3000
```

Abrir `http://localhost:3000`.

### 2. Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com/).
2. En **SQL Editor → New query**, pegar y ejecutar el contenido de `schema.sql`.
   Esto crea las tablas, las políticas RLS, el bucket de Storage `product-images` y carga los 53 productos iniciales.
   > ⚠️ El script empieza con un *reset* que borra y recrea las tablas: vuelve a dejar el catálogo inicial.
3. Crear el **usuario admin** del backoffice en **Authentication → Users → Add user** (con _Auto Confirm_):
   - el email que figura en `js/config.js` (`ADMIN_EMAIL`) y la contraseña que quieras.
4. Poner la **URL** y la **anon/publishable key** del proyecto en `js/config.js`.

### 3. Backoffice

- Entrar a `/panel.html`, loguearse con el usuario admin y ya se pueden cargar productos, categorías e imágenes.

---

## 🔐 Sobre las claves

La **anon key** (`sb_publishable_...`) es **pública por diseño**: solo permite lo que habilita RLS (en este proyecto, lectura para todos y escritura para usuarios logueados). Por eso es correcto versionarla en un sitio estático.

> Nunca subir la `service_role` / `sb_secret_` al repositorio: esa clave saltea RLS.

---

## 📦 Deploy

El proyecto se sirve en **Vercel**. Cada `push` a `master` dispara un deploy automático. No hay paso de build: se publican los archivos tal cual.

---

## 📞 Contacto

- **WhatsApp:** +54 9 11 7134-9389
- **Instagram:** [@Ebtools](https://www.instagram.com/Ebtools)
- **MercadoLibre:** [EBTOOLS](https://listado.mercadolibre.com.ar/ebtools)

---

© EBTOOLS Herramientas — Importadores y distribuidores · Argentina.
