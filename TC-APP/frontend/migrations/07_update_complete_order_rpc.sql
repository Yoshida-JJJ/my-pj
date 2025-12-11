-- Migration: Update complete_order RPC to remove catalog_id dependency
-- Created at: 2025-12-11

CREATE OR REPLACE FUNCTION public.complete_order(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update listing status to Completed
  UPDATE listing_items
  SET status = 'Completed'
  WHERE id = p_listing_id;

  -- Update order status to completed
  UPDATE orders
  SET status = 'completed'
  WHERE listing_id = p_listing_id;
END;
$$;
