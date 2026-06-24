-- ===== EBTOOLS — MIGRACIÓN INCREMENTAL v5 =====
-- Ejecutar en Supabase → SQL Editor → New query → Run
-- NO borra datos existentes.
--
-- Qué hace:
--   1) Crea product_events: registra cada vez que un visitante abre un producto.
--      Solo guarda product_id + timestamp (sin datos personales).
--   2) RLS: cualquiera puede insertar (visitantes), solo autenticados pueden leer (panel).
--   3) Función get_product_clicks para agregar por producto en el panel.

-- ---------- 1) TABLA ----------
create table if not exists product_events (
  id         bigint generated always as identity primary key,
  product_id int            not null,
  created_at timestamptz    not null default now()
);
create index if not exists product_events_pid_idx on product_events (product_id, created_at desc);

-- ---------- 2) RLS ----------
alter table product_events enable row level security;

-- Cualquier visitante puede insertar (tracking anónimo sin PII).
drop policy if exists "anon_insert_events" on product_events;
create policy "anon_insert_events"
  on product_events for insert
  with check (true);

-- Solo usuarios autenticados (admins del panel) pueden leer.
drop policy if exists "auth_read_events" on product_events;
create policy "auth_read_events"
  on product_events for select
  using (auth.role() = 'authenticated');

-- ---------- 3) FUNCIÓN DE AGREGADO ----------
-- Panel llama sb.rpc('get_product_clicks', { days_back: 30 })
-- days_back = null → todos los registros (sin límite de fecha).
create or replace function get_product_clicks(days_back int default null)
returns table(product_id int, click_count bigint)
language sql security definer stable
as $$
  select product_id, count(*) as click_count
  from product_events
  where (days_back is null or created_at > now() - (days_back || ' days')::interval)
  group by product_id
  order by click_count desc;
$$;
