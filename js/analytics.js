/* ===== EBTOOLS — ANALYTICS TRACKER =====
   Registra TODO lo que hace un visitante (sin datos personales): sesiones,
   vistas de página, vistas e impresiones de producto, búsquedas, filtros,
   clicks a WhatsApp / redes, scroll, tiempo en página y el recorrido completo.

   Todo va a una sola tabla `analytics_events` en Supabase (ver
   analytics-schema.sql). Es 100% fire-and-forget: si Supabase falla o no está
   configurado, el sitio sigue andando exactamente igual. Nunca tira errores
   hacia la UI.

   Se carga en index.html y producto.html — NUNCA en panel.html (no queremos
   trackear al propio administrador). */

(function () {
  'use strict';

  // ---------- Cliente Supabase (reusa el de supabase-data.js) ----------
  function sb() {
    try {
      if (typeof getSupabase === 'function') return getSupabase();
    } catch (_) {}
    return null;
  }

  // ---------- IDs de visitante / sesión ----------
  const uuid = () => {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
    return 'x-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  };

  function store(get, key, factory) {
    try {
      const s = get();
      let v = s.getItem(key);
      const existed = !!v;
      if (!v) { v = factory(); s.setItem(key, v); }
      return { value: v, existed };
    } catch (_) {
      // Modo incógnito / storage bloqueado: id efímero en memoria.
      return { value: factory(), existed: false };
    }
  }

  const vid = store(() => localStorage, 'eb_vid', uuid);       // visitante (persistente)
  const sid = store(() => sessionStorage, 'eb_sid', uuid);     // sesión (por pestaña/visita)
  const VISITOR_ID = vid.value;
  const SESSION_ID = sid.value;
  const IS_NEW_VISITOR = !vid.existed;   // primera vez que lo vemos
  const IS_NEW_SESSION = !sid.existed;   // arranca una sesión nueva

  // ---------- Detección de dispositivo / navegador / SO ----------
  function detect() {
    const ua = navigator.userAgent || '';
    let device = 'desktop';
    if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) device = 'tablet';
    else if (/Mobi|iPhone|iPod|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(ua)) device = 'mobile';

    let browser = 'Otro';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
    else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
    else if (/Chrome\//.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = 'Safari';

    let os = 'Otro';
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
    else if (/Mac OS X/.test(ua)) os = 'macOS';
    else if (/Linux/.test(ua)) os = 'Linux';

    return { device, browser, os };
  }

  // ---------- Referrer / fuente de tráfico ----------
  function referrerInfo() {
    const ref = document.referrer || '';
    let source = 'directo';
    let host = '';
    if (ref) {
      try {
        host = new URL(ref).hostname.replace(/^www\./, '');
        if (host === location.hostname.replace(/^www\./, '')) source = 'interno';
        else if (/google\./.test(host)) source = 'Google';
        else if (/bing\./.test(host)) source = 'Bing';
        else if (/duckduckgo\./.test(host)) source = 'DuckDuckGo';
        else if (/instagram\./.test(host)) source = 'Instagram';
        else if (/facebook\.|fb\./.test(host)) source = 'Facebook';
        else if (/t\.co|twitter\.|x\.com/.test(host)) source = 'Twitter/X';
        else if (/tiktok\./.test(host)) source = 'TikTok';
        else if (/mercadolibre\.|mercadolivre\./.test(host)) source = 'MercadoLibre';
        else if (/whatsapp\.|wa\.me/.test(host)) source = 'WhatsApp';
        else source = host;
      } catch (_) { source = 'otro'; }
    }
    return { source, host, ref };
  }

  // ---------- UTM ----------
  function utmInfo() {
    try {
      const q = new URLSearchParams(location.search);
      const out = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => {
        const v = q.get(k);
        if (v) out[k] = v.slice(0, 120);
      });
      return out;
    } catch (_) { return {}; }
  }

  const DEV = detect();

  // ---------- Cola + envío ----------
  let queue = [];
  let flushTimer = null;

  function pageName() {
    const p = location.pathname.replace(/\/+$/, '') || '/';
    return p === '/' || /index/.test(p) ? 'inicio' : p.replace(/^\//, '').replace(/\.html$/, '');
  }

  function baseRow(type, extra) {
    const row = {
      session_id: SESSION_ID,
      visitor_id: VISITOR_ID,
      type: type,
      path: pageName(),
      meta: Object.assign({}, extra && extra.meta ? extra.meta : {}),
    };
    if (extra) {
      if (extra.product_id != null) row.product_id = Number(extra.product_id) || null;
      if (extra.query != null) row.query = String(extra.query).slice(0, 200);
    }
    return row;
  }

  function enqueue(row) {
    queue.push(row);
    if (queue.length >= 12) { flush(); return; }
    if (!flushTimer) flushTimer = setTimeout(flush, 1500);
  }

  function flush() {
    clearTimeout(flushTimer);
    flushTimer = null;
    if (!queue.length) return;
    const batch = queue;
    queue = [];
    const client = sb();
    if (!client) return; // sin Supabase: se descarta silenciosamente
    try {
      client.from('analytics_events').insert(batch).then(
        () => {}, () => {} // fire-and-forget: ignorar errores
      );
    } catch (_) {}
  }

  // Envío final garantizado al cerrar/ocultar la pestaña (keepalive).
  function flushBeacon(extraRows) {
    const rows = queue.concat(extraRows || []);
    queue = [];
    if (!rows.length) return;
    const cfg = window.EBTOOLS_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;
    try {
      fetch(cfg.SUPABASE_URL + '/rest/v1/analytics_events', {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(rows),
      }).catch(() => {});
    } catch (_) {}
  }

  // ---------- API pública ----------
  const track = (type, extra) => { try { enqueue(baseRow(type, extra)); } catch (_) {} };

  // ---------- Scroll depth ----------
  let maxScroll = 0;
  function onScroll() {
    try {
      const h = document.documentElement;
      const scrollable = (h.scrollHeight - h.clientHeight);
      const pct = scrollable > 0 ? Math.min(100, Math.round((h.scrollTop || window.scrollY) / scrollable * 100)) : 100;
      if (pct > maxScroll) maxScroll = pct;
    } catch (_) {}
  }

  // ---------- Impresiones de producto (qué productos SE VEN aunque no se cliqueen) ----------
  const seenImpressions = new Set();
  let io = null, mo = null;
  function initImpressions() {
    if (!('IntersectionObserver' in window)) return;
    io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const id = e.target.getAttribute('data-id');
        if (!id || seenImpressions.has(id)) return;
        seenImpressions.add(id);
        track('product_impression', { product_id: id });
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });

    const observeAll = () => {
      document.querySelectorAll('.product-card[data-id]').forEach(c => {
        if (!c.__ebObserved) { c.__ebObserved = true; io.observe(c); }
      });
    };
    observeAll();
    // Las cards se renderizan de forma asíncrona (Supabase) y con "Ver más".
    const grid = document.getElementById('products-grid') || document.body;
    mo = new MutationObserver(() => observeAll());
    mo.observe(grid, { childList: true, subtree: true });
  }

  // ---------- Clicks salientes / conversiones (delegado global) ----------
  function currentProductId() {
    if (window.__EB_PRODUCT_ID != null) return window.__EB_PRODUCT_ID;
    try {
      const q = new URLSearchParams(location.search);
      const id = q.get('id');
      return id ? Number(id) : null;
    } catch (_) { return null; }
  }

  function initClicks() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      try {
        if (/wa\.me|api\.whatsapp\.com|whatsapp:/i.test(href)) {
          track('whatsapp_click', { product_id: currentProductId(), meta: { where: pageName() } });
        } else if (/instagram\.com/i.test(href)) {
          track('outbound_click', { meta: { to: 'Instagram' } });
        } else if (/mercadolibre\.|mercadolivre\./i.test(href)) {
          track('outbound_click', { meta: { to: 'MercadoLibre' } });
        } else if (/^mailto:/i.test(href)) {
          track('outbound_click', { meta: { to: 'Email' } });
        } else if (/^tel:/i.test(href)) {
          track('outbound_click', { meta: { to: 'Teléfono' } });
        }
      } catch (_) {}
    }, true);
  }

  // ---------- Fin de página / sesión ----------
  let ended = false;
  const startTime = Date.now();
  function endPage() {
    if (ended) return;
    ended = true;
    const seconds = Math.round((Date.now() - startTime) / 1000);
    const rows = [
      baseRow('page_time', { meta: { seconds: seconds, scroll: maxScroll } }),
    ];
    flushBeacon(rows);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { flush(); endPage(); }
  });
  window.addEventListener('pagehide', endPage);
  window.addEventListener('beforeunload', endPage);

  // ---------- Arranque ----------
  function boot() {
    if (IS_NEW_SESSION) {
      const r = referrerInfo();
      track('session_start', {
        meta: Object.assign({
          device: DEV.device, browser: DEV.browser, os: DEV.os,
          source: r.source, referrer_host: r.host,
          new_visitor: IS_NEW_VISITOR,
          landing: pageName(),
          screen: (screen.width || 0) + 'x' + (screen.height || 0),
          viewport: (window.innerWidth || 0) + 'x' + (window.innerHeight || 0),
          lang: (navigator.language || '').slice(0, 12),
          tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 40),
        }, utmInfo()),
      });
    }
    // Vista de página en cada carga (lleva el device para poder segmentar aunque
    // la session_start haya quedado fuera de la ventana consultada).
    track('pageview', {
      meta: { device: DEV.device, title: (document.title || '').slice(0, 120), referrer_host: referrerInfo().host },
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    initClicks();
    initImpressions();
  }

  // Exponer API para los hooks de main.js / producto.js
  window.EBTrack = {
    track: track,
    productView: (id, extra) => track('product_view', Object.assign({ product_id: id }, extra || {})),
    search: (q, results) => { const s = String(q || '').trim(); if (s) track('search', { query: s, meta: { results: results == null ? null : Number(results) } }); },
    filterCat: (key) => track('filter_category', { meta: { cat: key } }),
    filterSubcat: (key, parent) => track('filter_subcategory', { meta: { subcat: key, cat: parent } }),
    loadMore: (n) => track('load_more', { meta: { batch: n } }),
    SESSION_ID, VISITOR_ID,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
