-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. ENUMS
create type manufacturer_enum as enum ('BBM', 'Calbee', 'Epoch', 'Topps_Japan', 'Topps');
create type team_enum as enum ('Giants', 'Tigers', 'Dragons', 'Swallows', 'Carp', 'BayStars', 'Hawks', 'Fighters', 'Marines', 'Buffaloes', 'Eagles', 'Lions', 'Dodgers');
create type rarity_enum as enum ('Common', 'Rare', 'Super Rare', 'Parallel', 'Autograph', 'Patch', 'Rookie', 'Legend');
create type listing_status_enum as enum ('Draft', 'Active', 'TransactionPending', 'AwaitingShipment', 'Shipped', 'Delivered', 'Completed', 'Cancelled');

-- 2. USERS (Profiles)
-- Supabase handles auth in auth.users. This table extends that data.
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = id);

-- 3. CARD CATALOG (Master Data)
create table public.card_catalogs (
  id uuid default uuid_generate_v4() primary key,
  manufacturer manufacturer_enum not null,
  series_name text,
  player_name text not null,
  team team_enum not null,
  card_number text,
  rarity rarity_enum,
  is_rookie boolean default false,
  year integer,
  created_at timestamptz default now()
);

-- RLS for Catalog
alter table public.card_catalogs enable row level security;
create policy "Catalog is viewable by everyone." on public.card_catalogs for select using (true);
-- Only admins should insert/update catalog (skipping policy for now or assume service role)

-- 4. LISTING ITEMS (Products)
create table public.listing_items (
  id uuid default uuid_generate_v4() primary key,
  catalog_id uuid references public.card_catalogs(id) not null,
  seller_id uuid references public.profiles(id) not null,
  status listing_status_enum default 'Draft'::listing_status_enum not null,
  price integer not null,
  images jsonb not null, -- Stores array of image URLs
  condition_grading jsonb not null, -- Stores grading details
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Listings
alter table public.listing_items enable row level security;
create policy "Listings are viewable by everyone." on public.listing_items for select using (true);
create policy "Users can create their own listings." on public.listing_items for insert with check (auth.uid() = seller_id);
create policy "Users can update their own listings." on public.listing_items for update using (auth.uid() = seller_id);

-- 5. ORDERS (Transaction History)
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listing_items(id) not null unique,
  buyer_id uuid references public.profiles(id) not null,
  payment_method_id text not null,
  total_amount integer not null,
  tracking_number text,
  created_at timestamptz default now()
);

-- RLS for Orders
alter table public.orders enable row level security;
create policy "Users can view their own orders (as buyer)." on public.orders for select using (auth.uid() = buyer_id);
create policy "Sellers can view orders for their items." on public.orders for select using (
  exists (
    select 1 from public.listing_items
    where listing_items.id = orders.listing_id
    and listing_items.seller_id = auth.uid()
  )
);
create policy "Users can create orders." on public.orders for insert with check (auth.uid() = buyer_id);

-- Function to handle new user signup (Trigger)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
