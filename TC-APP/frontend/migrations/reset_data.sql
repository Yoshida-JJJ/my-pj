-- Clean up data to reset environment
-- Run this in Supabase Dashboard SQL Editor
-- 1. Truncate Transaction Tables (Cascade to ensure dependent data is removed)
-- Note: 'messages' and 'notifications' omitted as they do not exist in current schema on staging.
-- If you added them manually, uncomment lines below:
-- TRUNCATE TABLE messages RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;
TRUNCATE TABLE orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE listing_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE live_moments RESTART IDENTITY CASCADE;
TRUNCATE TABLE payouts RESTART IDENTITY CASCADE;
-- Note: We generally do NOT delete auth.users to avoid breaking login sessions.
-- The seed script will check if users exist and reuse them if possible.