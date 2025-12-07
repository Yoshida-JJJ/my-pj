CREATE OR REPLACE FUNCTION complete_order(p_listing_id UUID)
RETURNS VOID AS $$
DECLARE
    v_buyer_id UUID;
    v_old_listing listing_items%ROWTYPE;
BEGIN
    -- 1. Get the listing and buyer info
    SELECT * INTO v_old_listing FROM listing_items WHERE id = p_listing_id;
    
    SELECT buyer_id INTO v_buyer_id FROM orders WHERE listing_id = p_listing_id;

    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'Order not found for listing %', p_listing_id;
    END IF;

    -- 2. Update old listing status to Completed
    UPDATE listing_items SET status = 'Completed' WHERE id = p_listing_id;

    -- 3. Create new listing for buyer
    INSERT INTO listing_items (
        catalog_id,
        seller_id,
        status,
        price,
        images,
        condition_grading
    ) VALUES (
        v_old_listing.catalog_id,
        v_buyer_id,
        'Draft',
        NULL,
        v_old_listing.images,
        v_old_listing.condition_grading
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
