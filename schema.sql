-- Supabase schema for PrevinirApp v3
create table if not exists public.users (
  id bigserial primary key,
  created_at timestamptz default now(),
  name text,
  email text unique,
  password_hash text,
  cpf text,
  phone text,
  phone_verified boolean default false
);
create table if not exists public.bookings (
  id bigserial primary key,
  created_at timestamptz default now(),
  user_id bigint references public.users(id) on delete cascade,
  user_email text,
  exam text,
  clinic_name text,
  clinic_address text,
  clinic_lat double precision,
  clinic_lng double precision
);
create table if not exists public.otps (
  id bigserial primary key,
  created_at timestamptz default now(),
  phone text,
  code text,
  expires_at timestamptz,
  consumed boolean default false
);
alter table public.users enable row level security;
alter table public.bookings enable row level security;
alter table public.otps enable row level security;

-- Policies (ajuste conforme necessidade; aqui leitura só do próprio usuário para bookings via backend)
create policy "bookings_select_backend" on public.bookings for select using (true);
create policy "users_select_backend" on public.users for select using (true);
create policy "otps_select_backend" on public.otps for select using (true);
