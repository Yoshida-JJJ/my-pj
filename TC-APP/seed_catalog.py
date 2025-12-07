
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("frontend/.env.local")

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: Supabase URL or Key not found in frontend/.env.local")
    exit(1)

supabase: Client = create_client(url, key)

sample_catalogs = [
    {
        "manufacturer": "Topps",
        "series_name": "Chrome",
        "player_name": "Shohei Ohtani",
        "team": "Dodgers",
        "card_number": "1",
        "rarity": "Super Rare",
        "is_rookie": False,
        "year": 2024
    },
    {
        "manufacturer": "BBM",
        "series_name": "Genesis",
        "player_name": "Roki Sasaki",
        "team": "Marines",
        "card_number": "17",
        "rarity": "Rare",
        "is_rookie": False,
        "year": 2023
    },
    {
        "manufacturer": "Epoch",
        "series_name": "Stars & Legends",
        "player_name": "Ichiro Suzuki",
        "team": "Marines", # Note: Ichiro played for Orix/Mariners, but using valid enum for now or need to check enum
        "card_number": "51",
        "rarity": "Legend",
        "is_rookie": False,
        "year": 2022
    },
    {
        "manufacturer": "Calbee",
        "series_name": "Pro Baseball Chips",
        "player_name": "Munetaka Murakami",
        "team": "Swallows",
        "card_number": "55",
        "rarity": "Common",
        "is_rookie": False,
        "year": 2024
    }
]

# Check team enum validity based on schema
# enum: 'Giants', 'Tigers', 'Dragons', 'Swallows', 'Carp', 'BayStars', 'Hawks', 'Fighters', 'Marines', 'Buffaloes', 'Eagles', 'Lions', 'Dodgers'
# Ichiro -> Marines is technically wrong team but valid enum. Let's change Ichiro to 'Buffaloes' (Orix)

sample_catalogs[2]["team"] = "Buffaloes"

print("Seeding catalog data...")

for item in sample_catalogs:
    try:
        data, count = supabase.table("card_catalogs").insert(item).execute()
        print(f"Inserted: {item['player_name']}")
    except Exception as e:
        print(f"Error inserting {item['player_name']}: {e}")

print("Seeding complete.")
