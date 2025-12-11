-- 1. Add missing specific columns from catalog to listing_items
ALTER TABLE public.listing_items ADD COLUMN IF NOT EXISTS card_number text;
ALTER TABLE public.listing_items ADD COLUMN IF NOT EXISTS series_name text;

-- 2. Backfill data: Copy from card_catalogs to listing_items where listing_items fields are null
-- We use COALESCE to keep existing overrides, or just unconditional copy if the target is null.
-- Actually, if mode was "add", target is likely null. If "edit" override, target has value.
-- We only fill where target is NULL to respect potential manual edits (though previous logic didn't really support edits well until now).
-- Safe bet: Fill where NULL.

UPDATE public.listing_items
SET
    player_name = COALESCE(public.listing_items.player_name, c.player_name),
    team = COALESCE(public.listing_items.team, c.team::text),
    year = COALESCE(public.listing_items.year, c.year),
    manufacturer = COALESCE(public.listing_items.manufacturer, c.manufacturer::text),
    is_rookie = COALESCE(public.listing_items.is_rookie, c.is_rookie),
    -- New columns
    card_number = COALESCE(public.listing_items.card_number, c.card_number),
    series_name = COALESCE(public.listing_items.series_name, c.series_name)
    -- rarity? We map 'Autograph' rarity to is_autograph=true if needed, but is_autograph is likely set manually or default false.
    -- Let's check rarity. If catalog says Autograph, we should probably ensure is_autograph is true?
    -- is_autograph = CASE WHEN c.rarity = 'Autograph' THEN true ELSE public.listing_items.is_autograph END
FROM public.card_catalogs c
WHERE public.listing_items.catalog_id = c.id;


-- 1b. Add missing columns to user_collections (assuming it follows similar structure or needs these to hold data)
ALTER TABLE public.user_collections ADD COLUMN IF NOT EXISTS player_name text;
ALTER TABLE public.user_collections ADD COLUMN IF NOT EXISTS team text;
ALTER TABLE public.user_collections ADD COLUMN IF NOT EXISTS year integer;
ALTER TABLE public.user_collections ADD COLUMN IF NOT EXISTS manufacturer text;
ALTER TABLE public.user_collections ADD COLUMN IF NOT EXISTS card_number text;
ALTER TABLE public.user_collections ADD COLUMN IF NOT EXISTS series_name text;
ALTER TABLE public.user_collections ADD COLUMN IF NOT EXISTS is_rookie boolean;
-- Add other cols if user_collections is used for rich display, otherwise basic info might suffice.

-- 2b. Backfill user_collections
UPDATE public.user_collections
SET
    player_name = COALESCE(public.user_collections.player_name, c.player_name),
    team = COALESCE(public.user_collections.team, c.team::text),
    year = COALESCE(public.user_collections.year, c.year),
    manufacturer = COALESCE(public.user_collections.manufacturer, c.manufacturer::text),
    card_number = COALESCE(public.user_collections.card_number, c.card_number),
    series_name = COALESCE(public.user_collections.series_name, c.series_name),
    is_rookie = COALESCE(public.user_collections.is_rookie, c.is_rookie)
FROM public.card_catalogs c
WHERE public.user_collections.catalog_id = c.id;

-- 3. Drop Foreign Key Constraints
ALTER TABLE public.listing_items DROP CONSTRAINT IF EXISTS listing_items_catalog_id_fkey;
ALTER TABLE public.user_collections DROP CONSTRAINT IF EXISTS user_collections_catalog_id_fkey;

-- 4. Drop catalog_id columns
ALTER TABLE public.listing_items DROP COLUMN IF EXISTS catalog_id;
ALTER TABLE public.user_collections DROP COLUMN IF EXISTS catalog_id;

-- 5. Drop card_catalogs table
DROP TABLE IF EXISTS public.card_catalogs CASCADE;

