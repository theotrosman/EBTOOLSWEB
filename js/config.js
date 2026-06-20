/* ===== EBTOOLS — SUPABASE CONFIG =====
   La anon key es PÚBLICA por diseño: solo permite las operaciones que
   habilita Row Level Security (RLS). En este proyecto: lectura para todos,
   escritura solo para usuarios autenticados (el admin del backoffice).
   Por eso es correcto versionar estos valores en un sitio estático. */
window.EBTOOLS_CONFIG = {
  SUPABASE_URL: 'https://orrvqtrjvzksvgstkjle.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_HdN7h-7jwukoaRFIDI6vWg_Nhg7Q1Z5',
  // Mapeo usuario -> email para Supabase Auth (Auth requiere email).
  ADMIN_EMAIL: 'usuarioebtools@ebtools.com.ar',
  ADMIN_USERNAME: 'USUARIOEBTOOLS',
};
