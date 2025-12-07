-- 1. Update Enum to include 'Display' and 'Sold'
ALTER TYPE listing_status_enum ADD VALUE IF NOT EXISTS 'Display';
ALTER TYPE listing_status_enum ADD VALUE IF NOT EXISTS 'Sold';

-- 2. Make price nullable in listing_items
ALTER TABLE listing_items ALTER COLUMN price DROP NOT NULL;

-- 3. Migrate user_collections to listing_items
-- We assume user_collections has: user_id, catalog_id, images, condition (text)
-- We map this to listing_items: seller_id, catalog_id, images, condition_grading (jsonb)
INSERT INTO listing_items (
    catalog_id,
    seller_id,
    status,
    price,
    images,
    condition_grading
)
SELECT
    catalog_id,
    user_id,
    'Draft', -- Default status for migrated items
    NULL,    -- Price is null for Draft/Collection items
    images,
    jsonb_build_object(
        'is_graded', CASE WHEN condition = 'Graded' THEN true ELSE false END,
        'service', CASE WHEN condition = 'Graded' THEN 'PSA' ELSE 'Raw' END, -- Defaulting to PSA/Raw for migration
        'score', 10 -- Placeholder score
    )
FROM user_collections;

-- 4. Verify migration (Optional select to check)
-- SELECT * FROM listing_items WHERE status = 'Draft';
