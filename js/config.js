/* ===== EBTOOLS — SUPABASE CONFIG =====
   La anon key es PÚBLICA por diseño: solo permite las operaciones que
   habilita Row Level Security (RLS). En este proyecto: lectura para todos,
   escritura solo para usuarios autenticados (el admin del backoffice).
   Por eso es correcto versionar estos valores en un sitio estático. */
window.EBTOOLS_CONFIG = {
  SUPABASE_URL: '__SUPABASE_URL__',
  SUPABASE_ANON_KEY: '__SUPABASE_ANON_KEY__',
  // Mapeo usuario -> email para Supabase Auth (Auth requiere email).
  ADMIN_EMAIL: 'usuarioebtools@ebtools.com.ar',
  ADMIN_USERNAME: 'USUARIOEBTOOLS',
};
