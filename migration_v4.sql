-- ===== EBTOOLS — MIGRACIÓN INCREMENTAL v4 =====
-- Ejecutar en Supabase → SQL Editor → New query → Run
-- NO borra datos existentes.
--
-- Qué hace:
--   1) Agrega catalog_pinned (bool) y catalog_order (int) a products.
--      catalog_pinned = true → aparece en los primeros slots del catálogo
--                              antes de que el usuario haga click en "Ver más".
--      catalog_order  = número de orden dentro de los pinneados (1 = primero).
--   2) Índice para que la query sea instantánea.

alter table products add column if not exists catalog_pinned boolean not null default false;
alter table products add column if not exists catalog_order  int     not null default 0;

create index if not exists products_catalog_idx on products (catalog_pinned, catalog_order);
