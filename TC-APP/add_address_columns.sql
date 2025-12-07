-- Add address columns to profiles table
alter table public.profiles
add column if not exists postal_code text,
add column if not exists address_line1 text,
add column if not exists address_line2 text,
add column if not exists phone_number text;
