/* ===== EBTOOLS — SUPABASE DATA LAYER =====
   Inicializa el cliente Supabase y carga categorías, subcategorías y
   productos desde la base. Si Supabase no está configurado o falla la
   conexión, el sitio sigue funcionando con los datos bundleados de
   products-data.js (PRODUCTS / CATEGORIES / SUBCATEGORIES). */

const SB_CFG = window.EBTOOLS_CONFIG || {};
const SB_READY = SB_CFG.SUPABASE_URL &&
  !SB_CFG.SUPABASE_URL.includes('__SUPABASE_URL__') &&
  SB_CFG.SUPABASE_ANON_KEY &&
  !SB_CFG.SUPABASE_ANON_KEY.includes('__SUPABASE_ANON_KEY__');

let supabaseClient = null;
function getSupabase() {
  if (!SB_READY) return null;
  if (supabaseClient) return supabaseClient;
  if (!window.supabase) return null;
  supabaseClient = window.supabase.createClient(SB_CFG.SUPABASE_URL, SB_CFG.SUPABASE_ANON_KEY);
  return supabaseClient;
}

/* Carga los datos desde Supabase y reemplaza los globals.
   Devuelve true si cargó desde la base, false si usa fallback. */
async function loadDataFromSupabase() {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const [cats, subs, prods] = await Promise.all([
      sb.from('categories').select('*').order('sort', { ascending: true }),
      sb.from('subcategories').select('*').order('sort', { ascending: true }),
      sb.from('products').select('*').eq('active', true).order('sort', { ascending: true }),
    ]);

    if (cats.error || subs.error || prods.error) {
      console.warn('[EBTOOLS] Error leyendo Supabase, uso datos locales.',
        cats.error || subs.error || prods.error);
      return false;
    }
    if (!cats.data?.length || !prods.data?.length) {
      console.warn('[EBTOOLS] Supabase sin datos, uso datos locales.');
      return false;
    }

    CATEGORIES = cats.data.map(c => ({ key: c.key, label: c.label, icon: c.icon || '' }));
    SUBCATEGORIES = subs.data.map(s => ({ key: s.key, cat: s.cat, label: s.label }));
    PRODUCTS = prods.data.map(p => ({
      id: p.id, name: p.name, slug: p.slug,
      cats: Array.isArray(p.cats) ? p.cats : (p.cat ? [p.cat] : []),
      subcats: Array.isArray(p.subcats) ? p.subcats : (p.subcat ? [p.subcat] : []),
      img: p.img, short: p.short || '', desc: p.descr || '',
      images:        Array.isArray(p.images)      ? p.images.filter(Boolean)      : [],
      videos:        Array.isArray(p.videos)      ? p.videos.filter(Boolean)      : [],
      related_ids:   Array.isArray(p.related_ids) ? p.related_ids                : [],
      featured:        !!p.featured,
      featured_sort:   p.featured_sort   || 0,
      catalog_pinned:  !!p.catalog_pinned,
      catalog_order:   p.catalog_order   || 0,
      badge:           p.badge           || '',
      badge_color:     p.badge_color     || 'green',
      badge_enabled:   !!p.badge_enabled,
    }));
    return true;
  } catch (err) {
    console.warn('[EBTOOLS] Supabase no disponible, uso datos locales.', err);
    return false;
  }
}
