-- Run this entire block in Supabase → SQL Editor → New Query → Run

-- 1. Profiles table (links auth users to agency vs client role)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text default 'client', -- 'agency' or 'client'
  client_id bigint,
  created_at timestamp default now()
);

-- 2. Clients table
create table if not exists clients (
  id bigserial primary key,
  name text not null,
  handle text,
  category text,
  status text default 'Active',
  gmv numeric default 0,
  manager text,
  owner_id uuid references auth.users,
  created_at timestamp default now()
);

-- 3. Products table
create table if not exists products (
  id bigserial primary key,
  client_id bigint references clients(id) on delete cascade,
  name text,
  sku text,
  price numeric,
  cogs numeric,
  shipping numeric,
  created_at timestamp default now()
);

-- 4. Samples table
create table if not exists samples (
  id bigserial primary key,
  client_id bigint references clients(id) on delete cascade,
  month text,
  qty numeric,
  cost numeric,
  created_at timestamp default now()
);

-- 5. Rights table
create table if not exists rights (
  id bigserial primary key,
  client_id bigint references clients(id) on delete cascade,
  creator text,
  video_link text,
  status text default 'Not Given',
  created_at timestamp default now()
);

-- 6. Retainers table
create table if not exists retainers (
  id bigserial primary key,
  client_id bigint references clients(id) on delete cascade,
  creator text,
  handle text,
  monthly_fee numeric,
  videos_per_month numeric,
  status text default 'Active',
  notes text,
  created_at timestamp default now()
);

-- 7. GMV table
create table if not exists gmv (
  id bigserial primary key,
  client_id bigint references clients(id) on delete cascade,
  month text,
  gmv numeric,
  created_at timestamp default now()
);

-- 8. Enable Row Level Security on all tables
alter table profiles  enable row level security;
alter table clients   enable row level security;
alter table products  enable row level security;
alter table samples   enable row level security;
alter table rights    enable row level security;
alter table retainers enable row level security;
alter table gmv       enable row level security;

-- 9. RLS Policies — Agency (role='agency') sees everything, clients see only their data

-- Profiles: users can read their own profile
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- Clients: agency sees all, client sees only their own row
create policy "Agency sees all clients" on clients for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'agency'));

create policy "Client sees own record" on clients for select
  using (exists (select 1 from profiles where id = auth.uid() and client_id = clients.id));

-- Products, Samples, Rights, Retainers, GMV: agency sees all; client sees their client_id only
create policy "Agency full access products" on products for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'agency'));
create policy "Client sees own products" on products for select
  using (exists (select 1 from profiles where id = auth.uid() and client_id = products.client_id));

create policy "Agency full access samples" on samples for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'agency'));
create policy "Client sees own samples" on samples for select
  using (exists (select 1 from profiles where id = auth.uid() and client_id = samples.client_id));

create policy "Agency full access rights" on rights for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'agency'));
create policy "Client sees own rights" on rights for select
  using (exists (select 1 from profiles where id = auth.uid() and client_id = rights.client_id));

create policy "Agency full access retainers" on retainers for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'agency'));
create policy "Client sees own retainers" on retainers for select
  using (exists (select 1 from profiles where id = auth.uid() and client_id = retainers.client_id));

create policy "Agency full access gmv" on gmv for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'agency'));
create policy "Client sees own gmv" on gmv for select
  using (exists (select 1 from profiles where id = auth.uid() and client_id = gmv.client_id));

-- 10. Auto-create profile when user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'role', 'client'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
