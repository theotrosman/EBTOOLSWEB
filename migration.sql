-- ===== EBTOOLS — MIGRACIÓN INCREMENTAL v2 =====
-- Ejecutar en Supabase → SQL Editor → New query → Run
-- NO borra datos existentes — solo agrega columnas nuevas.

alter table products add column if not exists images        text[]   not null default '{}';
alter table products add column if not exists videos        text[]   not null default '{}';
alter table products add column if not exists related_ids   bigint[] not null default '{}';
alter table products add column if not exists featured      boolean  not null default false;
alter table products add column if not exists featured_sort int      not null default 0;
alter table products add column if not exists badge         text     not null default '';
alter table products add column if not exists badge_color   text     not null default 'green';
alter table products add column if not exists badge_enabled boolean  not null default false;

-- Marca los primeros 6 productos activos como destacados en el hero.
-- Podés cambiarlos luego desde el panel: Productos → Editar → ☑ Destacado en el hero.
update products p
set featured = true,
    featured_sort = sub.rn
from (
  select id, row_number() over (order by sort) as rn
  from products
  where active = true
  order by sort
  limit 6
) sub
where p.id = sub.id;
