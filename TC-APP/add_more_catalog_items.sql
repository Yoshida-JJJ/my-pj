
-- Add more sample data to card_catalogs
insert into public.card_catalogs (manufacturer, year, series_name, player_name, team, card_number, rarity, is_rookie)
values
  ('Topps', 2024, 'Chrome', 'Yoshinobu Yamamoto', 'Dodgers', '18', 'Rookie', true),
  ('Topps', 2024, 'Chrome', 'Shohei Ohtani', 'Dodgers', '17', 'Super Rare', false),
  ('BBM', 2023, 'Glory', 'Roki Sasaki', 'Marines', '17', 'Rare', false),
  ('BBM', 2023, 'Genesis', 'Munetaka Murakami', 'Swallows', '55', 'Super Rare', false),
  ('Epoch', 2022, 'Stars & Legends', 'Masataka Yoshida', 'Buffaloes', '7', 'Autograph', false),
  ('Topps_Japan', 2021, 'NPB Chrome', 'Seiya Suzuki', 'Carp', '51', 'Rare', false),
  ('Calbee', 2020, 'Pro Baseball Chips', 'Hayato Sakamoto', 'Giants', '6', 'Common', false),
  ('BBM', 2019, '1st Version', 'Koji Chikamoto', 'Tigers', '5', 'Rookie', true),
  ('Epoch', 2024, 'Premier', 'Shugo Maki', 'BayStars', '2', 'Patch', false),
  ('Topps', 2001, 'Traded', 'Ichiro Suzuki', 'Marines', '51', 'Rookie', true), -- Mariners mapped to Marines for enum compatibility or need new enum
  ('Topps', 2018, 'Update', 'Shohei Ohtani', 'Fighters', '17', 'Rookie', true); -- Angels mapped to Fighters for enum compatibility

-- Note: Team enum might need expansion if we want MLB teams properly. 
-- Current enum: Giants, Tigers, Dragons, Swallows, Carp, BayStars, Hawks, Fighters, Marines, Buffaloes, Eagles, Lions, Dodgers
