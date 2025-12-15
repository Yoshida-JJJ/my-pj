-- Migration: Enhance orders table for Fulfillment Workflow
-- Created at: 2025-12-12

-- 1. Add Shipment Columns
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_address_snapshot jsonb, -- { name, postal_code, address, phone }
ADD COLUMN IF NOT EXISTS tracking_number text,
ADD COLUMN IF NOT EXISTS carrier text,
ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 1.5 Normalize Existing Statuses (Fixing 23514 violation)
-- Convert PascalCase or legacy values to snake_case allowed values
UPDATE public.orders SET status = 'pending' WHERE status = 'TransactionPending';
UPDATE public.orders SET status = 'awaiting_shipping' WHERE status = 'AwaitingShipment';
UPDATE public.orders SET status = 'shipped' WHERE status = 'Shipped';
UPDATE public.orders SET status = 'completed' WHERE status = 'Delivered';
-- Fallback for any other unmapped values if necessary, or let it fail if unknown.
-- Assuming 'paid' might be 'Paid'
UPDATE public.orders SET status = 'paid' WHERE status = 'Paid';

-- 2. Add Status Check Constraint
-- Allow: pending, awaiting_shipping, shipped, completed, cancelled, (and 'paid' for legacy/compatibility if needed)
-- Renaming 'paid' to 'awaiting_shipping' is ideal, but for now we accept both or assume 'paid' -> 'awaiting_shipping' logic in app.
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'paid', 'awaiting_shipping', 'shipped', 'completed', 'cancelled', 'returned'));

-- 3. Comments
COMMENT ON COLUMN public.orders.shipping_address_snapshot IS 'Fixed address snapshot at time of purchase';
COMMENT ON COLUMN public.orders.tracking_number IS 'Shipment tracking number';
COMMENT ON COLUMN public.orders.shipped_at IS 'Timestamp when seller marked as shipped';
COMMENT ON COLUMN public.orders.completed_at IS 'Timestamp when buyer received item';

-- 4. Enable RLS and Add Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts if re-running
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.orders;
DROP POLICY IF EXISTS "Users can view orders for their items" ON public.orders;
DROP POLICY IF EXISTS "Buyers can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers can view their orders" ON public.orders;

-- Policy: Users can view orders where they are the Buyer
CREATE POLICY "Buyers can view their orders"
ON public.orders FOR SELECT
USING (auth.uid() = buyer_id);

-- Policy: Users can view orders where they are the Seller (via listing_items join)
-- Optimized with EXISTS
CREATE POLICY "Sellers can view their orders"
ON public.orders FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.listing_items 
        WHERE listing_items.id = orders.listing_id 
        AND listing_items.seller_id = auth.uid()
    )
);

-- Note: No UPDATE/INSERT policies for public users. 
-- Updates must be done via Server Actions (Service Role) or RPC (Security Definer).

