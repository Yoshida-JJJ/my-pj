-- Add AI authenticity check columns to listing_items table
ALTER TABLE listing_items
  ADD COLUMN IF NOT EXISTS trust_score smallint,
  ADD COLUMN IF NOT EXISTS trust_level text CHECK (trust_level IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS metadata_check jsonb,
  ADD COLUMN IF NOT EXISTS score_note text,
  ADD COLUMN IF NOT EXISTS factors jsonb,
  ADD COLUMN IF NOT EXISTS positive_signals jsonb,
  ADD COLUMN IF NOT EXISTS overall_comment text;

-- Migrate existing risk_score data to trust_score (100 - risk_score)
-- Only run if risk_score column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listing_items' AND column_name = 'risk_score'
  ) THEN
    UPDATE listing_items
    SET trust_score = 100 - risk_score
    WHERE risk_score IS NOT NULL AND trust_score IS NULL;
  END IF;
END $$;
