-- ===== EBTOOLS — MIGRACIÓN INCREMENTAL v3 =====
-- Ejecutar en Supabase → SQL Editor → New query → Run
-- NO borra datos existentes — solo agrega columnas + triggers de auditoría.
--
-- Qué hace:
--   1) Agrega `updated_at` a products / categories / subcategories.
--   2) Crea un trigger que actualiza `updated_at` automáticamente
--      cada vez que se edita una fila (INSERT/UPDATE).
--   3) Backfill: deja `updated_at = created_at` (o now()) para filas viejas.
--   4) Crea índices para que ordenar por "últimos editados" sea instantáneo.

-- ---------- 1) COLUMNAS ----------
alter table products      add column if not exists updated_at timestamptz not null default now();
alter table categories    add column if not exists updated_at timestamptz not null default now();
alter table subcategories add column if not exists updated_at timestamptz not null default now();

-- ---------- 2) FUNCIÓN + TRIGGERS ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_products_updated_at      on products;
drop trigger if exists trg_categories_updated_at    on categories;
drop trigger if exists trg_subcategories_updated_at on subcategories;

create trigger trg_products_updated_at
  before insert or update on products
  for each row execute function set_updated_at();

create trigger trg_categories_updated_at
  before insert or update on categories
  for each row execute function set_updated_at();

create trigger trg_subcategories_updated_at
  before insert or update on subcategories
  for each row execute function set_updated_at();

-- ---------- 3) BACKFILL ----------
-- Para filas creadas antes de la migración, dejamos updated_at = created_at
-- (o now() si la tabla no tiene created_at).
update products
   set updated_at = coalesce(created_at, now())
 where updated_at is null
    or updated_at = '1970-01-01'::timestamptz;

-- ---------- 4) ÍNDICES ----------
create index if not exists products_updated_at_idx      on products      (updated_at desc);
create index if not exists categories_updated_at_idx    on categories    (updated_at desc);
create index if not exists subcategories_updated_at_idx on subcategories (updated_at desc);
