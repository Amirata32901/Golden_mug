-- Golden Mug Manager private orders table
create extension if not exists pgcrypto;

create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 order_code text not null unique,
 first_name text not null,
 last_name text not null,
 phone text not null,
 address text not null,
 items jsonb not null,
 total_amount bigint not null check (total_amount >= 0),
 status text not null default 'new' check (status in ('new','contacted','completed','cancelled')),
 created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
drop policy if exists "Admins can read orders" on public.orders;
create policy "Admins can read orders" on public.orders for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
