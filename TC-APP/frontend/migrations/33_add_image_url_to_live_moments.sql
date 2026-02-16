-- Migration: Add image_url to live_moments
-- id: 33_add_image_url_to_live_moments
ALTER TABLE public.live_moments
ADD COLUMN IF NOT EXISTS image_url text;