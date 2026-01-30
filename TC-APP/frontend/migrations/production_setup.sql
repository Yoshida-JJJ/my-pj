-- ======================================================================================
-- PRODUCTION DATABASE SETUP SCRIPT
-- Application: TC-APP (Trading Card App)
-- Generated at: 2026-01-27
--
-- This script consolidates all schema definitions, migrations, and RLS policies.
-- It is designed to be run on a FRESH Supabase instance.
-- ======================================================================================
-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
-- 2. ENUMS (Initial Definition)
create type manufacturer_enum as enum ('BBM', 'Calbee', 'Epoch', 'Topps_Japan', 'Topps');
create type team_enum as enum (
    'Giants',
    'Tigers',
    'Dragons',
    'Swallows',
    'Carp',
    'BayStars',
    'Hawks',
    'Fighters',
    'Marines',
    'Buffaloes',
    'Eagles',
    'Lions',
    'Dodgers'
);
create type rarity_enum as enum (
    'Common',
    'Rare',
    'Super Rare',
    'Parallel',
    'Autograph',
    'Patch',
    'Rookie',
    'Legend'
);
create type listing_status_enum as enum (
    'Draft',
    'Active',
    'TransactionPending',
    'AwaitingShipment',
    'Shipped',
    'Delivered',
    'Completed',
    'Cancelled'
);
-- Update Enum: Add 'Display', 'Sold', 'Incoming' (from update_status_enum.sql & migration 23)
ALTER TYPE listing_status_enum
ADD VALUE IF NOT EXISTS 'Display';
ALTER TYPE listing_status_enum
ADD VALUE IF NOT EXISTS 'Sold';
ALTER TYPE listing_status_enum
ADD VALUE IF NOT EXISTS 'Incoming';
-- 3. PROFILES Table
create table public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    email text unique not null,
    name text,
    avatar_url text,
    real_name_kana text,
    -- Added from migration 08
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.profiles for
select using (true);
create policy "Users can insert their own profile." on public.profiles for
insert with check (auth.uid() = id);
create policy "Users can update their own profile." on public.profiles for
update using (auth.uid() = id);
-- 4. CARD CATALOGS (Deprecated but kept for reference if needed, largely replaced by loose listing items)
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
alter table public.card_catalogs enable row level security;
create policy "Catalog is viewable by everyone." on public.card_catalogs for
select using (true);
-- 5. LISTING ITEMS (Products)
create table public.listing_items (
    id uuid default uuid_generate_v4() primary key,
    catalog_id uuid references public.card_catalogs(id),
    -- Nullable in new schema (migration 05)
    seller_id uuid references public.profiles(id) not null,
    status listing_status_enum default 'Draft'::listing_status_enum not null,
    price integer,
    -- Nullable (migration update_status_enum.sql)
    images jsonb not null,
    condition_grading jsonb not null,
    -- Additional columns from migrations
    origin_order_id uuid,
    -- migration 22 (Recursive references added later)
    deleted_at timestamptz DEFAULT NULL,
    -- migration 21
    moment_history jsonb DEFAULT '[]'::jsonb,
    -- migration 16
    -- Expanded columns (migration 04 consolidated)
    player_name text,
    team text,
    year integer,
    manufacturer text,
    set_name text,
    card_number text,
    is_rookie boolean default false,
    is_autograph boolean default false,
    start_price integer,
    min_bid_price integer,
    condition_rating text,
    -- migration fix_schema
    variation text,
    serial_number text,
    description text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
-- Note: references for origin_order_id will be added after orders table creation
-- 6. ORDERS (Transaction History)
create table public.orders (
    id uuid default uuid_generate_v4() primary key,
    listing_id uuid references public.listing_items(id) not null,
    -- Unique constraint removed/modified in migration 31
    buyer_id uuid references public.profiles(id) not null,
    seller_id uuid references public.profiles(id),
    -- migration 24
    payment_method_id text not null,
    total_amount integer not null,
    status text not null check (
        status IN (
            'pending',
            'paid',
            'awaiting_shipping',
            'shipped',
            'completed',
            'cancelled',
            'returned'
        )
    ),
    -- migration 12
    -- Shipping Details (migration 09 & 12)
    tracking_number text,
    carrier text,
    shipped_at timestamptz,
    completed_at timestamptz,
    shipping_address_snapshot jsonb,
    shipping_name text,
    shipping_postal_code text,
    shipping_address text,
    shipping_phone text,
    -- Live Moments (migration 15)
    moment_snapshot jsonb,
    created_at timestamptz default now()
);
-- Add Circular Reference for listing_items
ALTER TABLE public.listing_items
ADD CONSTRAINT fk_origin_order FOREIGN KEY (origin_order_id) REFERENCES public.orders(id);
-- 7. BANK ACCOUNTS & PAYOUTS (migration 08 & 10 & 11)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    bank_name text NOT NULL,
    branch_name text NOT NULL,
    account_type text NOT NULL,
    account_number text NOT NULL,
    account_holder_name text NOT NULL,
    bank_code text,
    -- migration 10
    branch_code text,
    -- migration 10
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.payouts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount integer NOT NULL,
    fee integer not null default 0,
    -- migration 11
    payout_amount integer not null,
    -- migration 11
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz
);
-- 8. LIVE MOMENTS (migration 14, 17, 18)
create table if not exists public.live_moments (
    id uuid default gen_random_uuid() primary key,
    player_name text not null,
    title text not null,
    description text,
    intensity integer not null default 1 check (
        intensity >= 1
        and intensity <= 5
    ),
    match_result text,
    -- migration 17
    is_finalized boolean DEFAULT false,
    -- migration 18
    created_at timestamptz default now()
);
-- 9. INDICES
CREATE INDEX IF NOT EXISTS idx_listing_items_origin_order_id ON public.listing_items(origin_order_id);
-- Partial index from migration 31
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_order_per_listing ON public.orders (listing_id)
WHERE (status NOT IN ('completed', 'cancelled'));
-- 10. ROW LEVEL SECURITY (Consolidated Final Policies - Migration 27 & 32 mostly)
-- A. Table Enablement
ALTER TABLE public.listing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_moments ENABLE ROW LEVEL SECURITY;
-- B. Listings Policies (Non-Recursive)
-- Public Access
CREATE POLICY "Listings_Public_Access" ON public.listing_items FOR
SELECT USING (
        status = 'Active'
        AND deleted_at IS NULL
    );
-- Owner Access
CREATE POLICY "Listings_Owner_Access" ON public.listing_items FOR
SELECT USING (seller_id = auth.uid());
CREATE POLICY "Listings_Owner_Update" ON public.listing_items FOR
UPDATE USING (seller_id = auth.uid());
CREATE POLICY "Listings_Owner_Delete" ON public.listing_items FOR DELETE USING (seller_id = auth.uid());
-- Transaction History Access (Sold & Bought)
CREATE POLICY "Listings_SoldHistory_Access" ON public.listing_items FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.orders
            WHERE orders.listing_id = listing_items.id
                AND orders.seller_id = auth.uid()
        )
    );
CREATE POLICY "Listings_InTransit_Access" ON public.listing_items FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.orders
            WHERE orders.listing_id = listing_items.id
                AND orders.buyer_id = auth.uid()
        )
    );
-- C. Orders Policies
CREATE POLICY "Orders_Buyer_Access" ON public.orders FOR
SELECT USING (buyer_id = auth.uid());
CREATE POLICY "Orders_Seller_Access" ON public.orders FOR
SELECT USING (seller_id = auth.uid());
CREATE POLICY "Users can create orders" ON public.orders FOR
INSERT WITH CHECK (auth.uid() = buyer_id);
-- D. Bank & Payouts Policies
CREATE POLICY "Users can view own bank account" ON public.bank_accounts FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank account" ON public.bank_accounts FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank account" ON public.bank_accounts FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bank account" ON public.bank_accounts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payouts" ON public.payouts FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payouts" ON public.payouts FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- E. Live Moments Policies
CREATE POLICY "Live moments are viewable by everyone" on public.live_moments for
select using (true);
-- 11. STORAGE SETUP (Migration 32)
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true) on conflict (id) do nothing;
create policy "Public Access" on storage.objects for
select using (bucket_id = 'card-images');
create policy "Authenticated users can upload images" on storage.objects for
insert with check (
        bucket_id = 'card-images'
        and auth.role() = 'authenticated'
    );
create policy "Users can update own images" on storage.objects for
update using (
        bucket_id = 'card-images'
        and auth.uid() = owner
    );
create policy "Users can delete own images" on storage.objects for delete using (
    bucket_id = 'card-images'
    and auth.uid() = owner
);
-- 12. TRIGGERS & FUNCTIONS
-- Handle New User
create or replace function public.handle_new_user() returns trigger as $$ begin
insert into public.profiles (id, email, name)
values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'name'
    );
return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
after
insert on auth.users for each row execute procedure public.handle_new_user();
-- Self-Healing Complete Order (Migration 30)
CREATE OR REPLACE FUNCTION public.complete_order(p_listing_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN -- Update listing status to Draft (makes it ownable/visible in Workspace but not listed)
UPDATE listing_items
SET status = 'Draft',
    updated_at = NOW()
WHERE id = p_listing_id;
-- Update order status to completed
UPDATE orders
SET status = 'completed',
    completed_at = NOW()
WHERE listing_id = p_listing_id;
END;
$$;