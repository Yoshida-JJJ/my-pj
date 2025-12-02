import requests
import uuid
import random

API_URL = "http://localhost:8000"

# 1. Define sample catalog data (Different teams, players)
catalog_items = [
    {
        "manufacturer": "BBM",
        "year": 2024,
        "series_name": "Genesis",
        "player_name": "Teruaki Sato",
        "team": "Tigers",
        "card_number": "G-05",
        "rarity": "Rare",
        "is_rookie": False
    },
    {
        "manufacturer": "Calbee",
        "year": 2024,
        "series_name": "Pro Baseball Chips",
        "player_name": "Kazuma Okamoto",
        "team": "Giants",
        "card_number": "C-01",
        "rarity": "Star",
        "is_rookie": False
    },
    {
        "manufacturer": "Epoch",
        "year": 2023,
        "series_name": "Stars & Legends",
        "player_name": "Munetaka Murakami",
        "team": "Swallows",
        "card_number": "SL-55",
        "rarity": "Autograph",
        "is_rookie": False
    },
    {
        "manufacturer": "Topps_Japan",
        "year": 2024,
        "series_name": "Chrome",
        "player_name": "Roki Sasaki",
        "team": "Marines",
        "card_number": "TC-17",
        "rarity": "Refractor",
        "is_rookie": False
    },
    {
        "manufacturer": "BBM",
        "year": 2024,
        "series_name": "Rookie Edition",
        "player_name": "Shota Morishita",
        "team": "Tigers",
        "card_number": "RE-01",
        "rarity": "Common",
        "is_rookie": True
    }
]

def seed():
    print("Starting seed process...")
    
    # Get existing catalog items to avoid duplicates or just use them
    # For simplicity, we'll try to create them. 
    # Since we don't have a direct 'create catalog' endpoint exposed in the snippet I saw (only debug/seed),
    # I will assume I need to use the internal DB or if there is an endpoint.
    # Wait, looking at main.py, there is NO endpoint to create arbitrary catalog items exposed generally, only /debug/seed which creates ONE specific item.
    
    # I should check if I can add a temporary endpoint to main.py to bulk create catalog items, 
    # OR just use the python shell to do it via models.
    # Using python shell is safer/cleaner than modifying main.py again.
    pass

if __name__ == "__main__":
    seed()
