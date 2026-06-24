-- ===== EBTOOLS — MIGRACIÓN INCREMENTAL v6 =====
-- Ejecutar en Supabase → SQL Editor → New query → Run

-- ---------- 1) DISPONIBILIDAD EN PRODUCTOS ----------
alter table products add column if not exists
  availability text not null default 'available'
  check (availability in ('available', 'out_of_stock', 'on_request'));

-- ---------- 2) BANNER DEL SITIO ----------
create table if not exists banner (
  id     int  primary key default 1,
  text   text not null default '',
  active bool not null default false,
  constraint banner_single_row check (id = 1)
);
-- Asegura que siempre exista la fila
insert into banner (id, text, active) values (1, '', false) on conflict do nothing;

alter table banner enable row level security;

drop policy if exists "public_read_banner"  on banner;
drop policy if exists "auth_write_banner"   on banner;
create policy "public_read_banner" on banner for select using (true);
create policy "auth_write_banner"  on banner for all    using (auth.role() = 'authenticated');
