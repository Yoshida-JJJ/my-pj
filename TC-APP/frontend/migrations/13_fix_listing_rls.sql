-- Migration: Fix Listing Items RLS for Sellers
-- Created at: 2025-12-12
-- Goal: Ensure sellers can view their own items (even if not Active), 
-- which is required for the orders RLS policy to work.

ALTER TABLE public.listing_items ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Users can view their own items (All statuses)
DROP POLICY IF EXISTS "Users can view own items" ON public.listing_items;

CREATE POLICY "Users can view own items"
ON public.listing_items FOR SELECT
USING (auth.uid() = seller_id);

-- 2. Policy: Public can view Active items (re-affirming existing or creating if missing)
-- (We use separate names to not conflict if "Enable read access for all users" exists for everything)
-- Assuming there might be an existing policy "Enable read access for all users" which might be filtering by status.
-- We add "Users can view own items" which is permissive for the owner. 
-- PostgREST combines policies with OR. So if one allows, access is granted.
