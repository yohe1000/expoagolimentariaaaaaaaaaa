-- =============================================================================
-- EXPO AGROALIMENTARIA LA GRITA 2026 · FASE 2 MIGRACIÓN SUPABASE (PostgreSQL + RLS)
-- Roles desde profiles ('admin', 'staff'), vista pública stands_public,
-- bloqueo automático de 48 horas (hold_until) y políticas RLS endurecidas.
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. Tabla de perfiles y roles (RBAC: solo 'admin' y 'staff', nunca en user_metadata)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('admin', 'staff')),
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile or admins read all"
  on public.profiles for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role in ('admin', 'staff')
    )
  );

create policy "Only admins can insert or update profiles"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );

-- Helper SQL functions for RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('admin', 'staff')
  );
$$;

-- 2. Tabla de stands (51 Salón de Exposiciones + 8 Zonas Expoauto = 59 espacios)
create table if not exists public.stands (
  id text primary key,
  code text not null unique,
  zone_id text not null,
  type text not null,
  width numeric(6,2) not null,
  depth numeric(6,2) not null,
  x numeric(6,2) not null,
  z numeric(6,2) not null,
  price_usd numeric(10,2) not null,
  status text not null default 'disponible' check (status in ('disponible', 'reservado', 'vendido', 'bloqueado')),
  hold_until timestamptz,
  exhibitor_id text,
  location_label text not null,
  updated_at timestamptz not null default now()
);

alter table public.stands enable row level security;

create policy "Only admins can update stands directly"
  on public.stands for all
  using (public.is_admin());

-- 3. Vista pública segura: stands_public (calcula effective_status con expiración de 48h)
create or replace view public.stands_public as
select
  s.id,
  s.code,
  s.zone_id,
  s.type,
  s.width,
  s.depth,
  s.x,
  s.z,
  s.price_usd,
  s.status,
  case
    when s.status = 'reservado' and s.hold_until is not null and s.hold_until <= now() then 'disponible'
    else s.status
  end as effective_status,
  s.hold_until,
  s.exhibitor_id,
  s.location_label
from public.stands s;

grant select on public.stands_public to anon, authenticated;

-- 4. Tabla de solicitudes de stand con bloqueo automático de 48 horas
create table if not exists public.stand_requests (
  id text primary key default ('req-' || substr(md5(random()::text), 1, 8)),
  stand_code text not null references public.stands(code),
  company_name text not null,
  rif text not null,
  contact_name text not null,
  whatsapp text not null,
  email text not null,
  sector text not null,
  notes text default '',
  status text not null default 'pendiente' check (status in ('pendiente', 'confirmada', 'liberada')),
  hold_expires_at timestamptz not null default (now() + interval '48 hours'),
  honeypot text default '',
  created_at timestamptz not null default now()
);

alter table public.stand_requests enable row level security;

-- Trigger que valida que el stand esté disponible, rechaza honeypot y aplica el bloqueo de 48h
create or replace function public.handle_new_stand_request()
returns trigger
language plpgsql
security definer
as $$
declare
  v_stand public.stands%rowtype;
  v_recent_count integer;
begin
  -- Honeypot check
  if coalesce(trim(new.honeypot), '') <> '' then
    raise exception 'Solicitud bloqueada por filtro anti-spam (honeypot).';
  end if;

  -- Rate limit: max 6 requests per 10 minutes per WhatsApp
  select count(*) into v_recent_count
  from public.stand_requests
  where whatsapp = new.whatsapp
    and created_at > now() - interval '10 minutes';

  if v_recent_count >= 6 then
    raise exception 'Límite de solicitudes alcanzado. Intenta nuevamente en unos minutos.';
  end if;

  select * into v_stand
  from public.stands
  where code = upper(trim(new.stand_code))
  for update;

  if not found then
    raise exception 'El stand solicitado no existe en la planimetría.';
  end if;

  if v_stand.status = 'vendido' or v_stand.status = 'bloqueado' or
     (v_stand.status = 'reservado' and (v_stand.hold_until is null or v_stand.hold_until > now())) then
    raise exception 'El stand % ya no está disponible.', v_stand.code;
  end if;

  new.stand_code := v_stand.code;
  new.hold_expires_at := now() + interval '48 hours';

  update public.stands
  set status = 'reservado',
      hold_until = new.hold_expires_at,
      updated_at = now()
  where code = v_stand.code;

  return new;
end;
$$;

drop trigger if exists trg_stand_request_hold on public.stand_requests;
create trigger trg_stand_request_hold
  before insert on public.stand_requests
  for each row execute function public.handle_new_stand_request();

-- RLS Policies on stand_requests: public INSERT only, NO public SELECT
create policy "Public can insert stand_requests with empty honeypot"
  on public.stand_requests for insert
  to anon, authenticated
  with check (coalesce(trim(honeypot), '') = '');

create policy "Staff and admins can view stand_requests"
  on public.stand_requests for select
  to authenticated
  using (public.is_staff_or_admin());

create policy "Only admins can update stand_requests"
  on public.stand_requests for update
  to authenticated
  using (public.is_admin());

-- 5. Tabla de visitantes (Pase QR): INSERT público, sin SELECT masivo público
create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null,
  municipality text not null,
  profile text not null,
  interests text[] not null default '{}',
  consent boolean not null default true,
  qr_token text not null unique,
  utm_source text,
  heard_from text,
  honeypot text default '',
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.visitors enable row level security;

create policy "Public can insert visitor pass with empty honeypot"
  on public.visitors for insert
  to anon, authenticated
  with check (coalesce(trim(honeypot), '') = '' and consent = true);

create policy "Staff and admins can select visitors"
  on public.visitors for select
  to authenticated
  using (public.is_staff_or_admin());

create policy "Staff and admins can update visitor check-in"
  on public.visitors for update
  to authenticated
  using (public.is_staff_or_admin());

-- 6. Realtime publication on stands
alter publication supabase_realtime add table public.stands;
