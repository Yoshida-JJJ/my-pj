
-- Add missing columns to orders table
alter table public.orders 
add column if not exists shipping_address text,
add column if not exists status text default 'Pending';
