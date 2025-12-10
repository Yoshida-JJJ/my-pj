-- Migration: Add status column to orders table
-- Created at: 2025-12-10

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Optional: Create an enum if we want strict typing in DB, but text is flexible for Stripe statuses
-- checking usage: 'pending', 'paid', 'failed', 'cancelled'

COMMENT ON COLUMN public.orders.status IS 'Payment status: pending, paid, failed, etc.';
