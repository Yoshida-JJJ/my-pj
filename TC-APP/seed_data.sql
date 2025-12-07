
-- Insert sample data into card_catalogs
insert into public.card_catalogs (manufacturer, series_name, player_name, team, card_number, rarity, is_rookie, year)
values
  ('Topps', 'Chrome', 'Shohei Ohtani', 'Dodgers', '1', 'Super Rare', false, 2024),
  ('BBM', 'Genesis', 'Roki Sasaki', 'Marines', '17', 'Rare', false, 2023),
  ('Epoch', 'Stars & Legends', 'Ichiro Suzuki', 'Buffaloes', '51', 'Legend', false, 2022),
  ('Calbee', 'Pro Baseball Chips', 'Munetaka Murakami', 'Swallows', '55', 'Common', false, 2024);
