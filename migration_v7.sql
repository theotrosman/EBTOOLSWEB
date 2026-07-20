-- ===== EBTOOLS — MIGRATION v7 =====
-- Orden de productos por importancia, por contexto.
--   · sort         (ya existía) → orden GENERAL del catálogo.
--   · cat_order    → orden dentro de CADA categoría   { "clave-cat": 3, ... }
--   · subcat_order → orden dentro de CADA subcategoría { "clave-sub": 2, ... }
-- Un producto puede estar en varias categorías/subcategorías, por eso el orden
-- se guarda como un mapa clave→número (0 = sin preferencia, va al final).

alter table public.products
  add column if not exists cat_order    jsonb not null default '{}'::jsonb,
  add column if not exists subcat_order jsonb not null default '{}'::jsonb;
