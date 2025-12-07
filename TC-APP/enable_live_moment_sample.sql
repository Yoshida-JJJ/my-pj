-- 最新のアイテム1つをLive Moment（金枠）に設定する
UPDATE listing_items
SET is_live_moment = TRUE
WHERE id = (
  SELECT id FROM listing_items
  ORDER BY created_at DESC
  LIMIT 1
);
