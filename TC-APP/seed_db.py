import sys
import os
import uuid
import random
from datetime import datetime

# Add current directory to path so we can import app modules
sys.path.append(os.getcwd())

from app import models, database
from sqlalchemy.orm import Session

def seed_db():
    db = database.SessionLocal()
    try:
        print("Seeding database...")
        
        # 1. Clear existing data
        print("Clearing existing data...")
        db.query(models.Order).delete()
        db.query(models.ListingItem).delete()
        db.query(models.CardCatalog).delete()
        db.commit()

        # Image URLs (Production)
        # Using Ohtani for Pitchers and Murakami for Batters due to generation limits
        BASE_URL = "https://baseball-card-api.onrender.com"
        IMG_OHTANI_FRONT = f"{BASE_URL}/static/uploads/ohtani_front.png"
        IMG_OHTANI_BACK = f"{BASE_URL}/static/uploads/ohtani_back.png"
        IMG_MURAKAMI_FRONT = f"{BASE_URL}/static/uploads/murakami_front.png"
        IMG_MURAKAMI_BACK = f"{BASE_URL}/static/uploads/murakami_back.png"

        # 2. Create Catalog Items (15 Cards)
        catalog_data = [
            # --- Real Images ---
            {
                "manufacturer": models.Manufacturer.Topps_Japan,
                "year": 2024,
                "series_name": "Chrome",
                "player_name": "Shohei Ohtani",
                "team": models.Team.Dodgers, # Assuming Dodgers is in Enum or mapped
                "card_number": "TC-17",
                "rarity": models.Rarity.Parallel,
                "is_rookie": False,
                "image_front": IMG_OHTANI_FRONT,
                "image_back": IMG_OHTANI_BACK
            },
            {
                "manufacturer": models.Manufacturer.Epoch,
                "year": 2023,
                "series_name": "Stars & Legends",
                "player_name": "Munetaka Murakami",
                "team": models.Team.Swallows,
                "card_number": "SL-55",
                "rarity": models.Rarity.Autograph,
                "is_rookie": False,
                "image_front": IMG_MURAKAMI_FRONT,
                "image_back": IMG_MURAKAMI_BACK
            },
            # --- Pitchers (Using Ohtani Image) ---
            {
                "manufacturer": models.Manufacturer.Topps_Japan,
                "year": 2020,
                "series_name": "Chrome",
                "player_name": "Roki Sasaki",
                "team": models.Team.Marines,
                "card_number": "RC-01",
                "rarity": models.Rarity.Rookie,
                "is_rookie": True,
                "image_front": IMG_OHTANI_FRONT,
                "image_back": IMG_OHTANI_BACK
            },
            {
                "manufacturer": models.Manufacturer.BBM,
                "year": 2017,
                "series_name": "Genesis",
                "player_name": "Yoshinobu Yamamoto",
                "team": models.Team.Buffaloes,
                "card_number": "G-18",
                "rarity": models.Rarity.Rare,
                "is_rookie": True,
                "image_front": IMG_OHTANI_FRONT,
                "image_back": IMG_OHTANI_BACK
            },
            {
                "manufacturer": models.Manufacturer.Topps,
                "year": 2012,
                "series_name": "Heritage",
                "player_name": "Yu Darvish",
                "team": models.Team.Fighters,
                "card_number": "H-11",
                "rarity": models.Rarity.Common,
                "is_rookie": True,
                "image_front": IMG_OHTANI_FRONT,
                "image_back": IMG_OHTANI_BACK
            },
            {
                "manufacturer": models.Manufacturer.BBM,
                "year": 1999,
                "series_name": "Diamond Heroes",
                "player_name": "Koji Uehara",
                "team": models.Team.Giants,
                "card_number": "DH-19",
                "rarity": models.Rarity.Rare,
                "is_rookie": True,
                "image_front": IMG_OHTANI_FRONT,
                "image_back": IMG_OHTANI_BACK
            },
            {
                "manufacturer": models.Manufacturer.BBM,
                "year": 1999,
                "series_name": "Rookie Edition",
                "player_name": "Daisuke Matsuzaka",
                "team": models.Team.Lions,
                "card_number": "RE-18",
                "rarity": models.Rarity.Rookie,
                "is_rookie": True,
                "image_front": IMG_OHTANI_FRONT,
                "image_back": IMG_OHTANI_BACK
            },
            # --- Batters (Using Murakami Image) ---
            {
                "manufacturer": models.Manufacturer.BBM,
                "year": 1992,
                "series_name": "Historic Collection",
                "player_name": "Ichiro Suzuki",
                "team": models.Team.Buffaloes, # Orix
                "card_number": "HC-51",
                "rarity": models.Rarity.Legend,
                "is_rookie": False,
                "image_front": IMG_MURAKAMI_FRONT,
                "image_back": IMG_MURAKAMI_BACK
            },
            {
                "manufacturer": models.Manufacturer.Calbee,
                "year": 2000,
                "series_name": "Star Card",
                "player_name": "Hideki Matsui",
                "team": models.Team.Giants,
                "card_number": "S-55",
                "rarity": models.Rarity.Rare,
                "is_rookie": False,
                "image_front": IMG_MURAKAMI_FRONT,
                "image_back": IMG_MURAKAMI_BACK
            },
            {
                "manufacturer": models.Manufacturer.Calbee,
                "year": 1977,
                "series_name": "Vintage",
                "player_name": "Sadaharu Oh",
                "team": models.Team.Giants,
                "card_number": "V-01",
                "rarity": models.Rarity.Legend,
                "is_rookie": False,
                "image_front": IMG_MURAKAMI_FRONT,
                "image_back": IMG_MURAKAMI_BACK
            },
            {
                "manufacturer": models.Manufacturer.Calbee,
                "year": 1965,
                "series_name": "Vintage",
                "player_name": "Shigeo Nagashima",
                "team": models.Team.Giants,
                "card_number": "V-03",
                "rarity": models.Rarity.Legend,
                "is_rookie": False,
                "image_front": IMG_MURAKAMI_FRONT,
                "image_back": IMG_MURAKAMI_BACK
            },
            {
                "manufacturer": models.Manufacturer.BBM,
                "year": 2024,
                "series_name": "Genesis",
                "player_name": "Kazuma Okamoto",
                "team": models.Team.Giants,
                "card_number": "G-25",
                "rarity": models.Rarity.Rare,
                "is_rookie": False,
                "image_front": IMG_MURAKAMI_FRONT,
                "image_back": IMG_MURAKAMI_BACK
            },
            {
                "manufacturer": models.Manufacturer.BBM,
                "year": 2021,
                "series_name": "Rookie Edition",
                "player_name": "Teruaki Sato",
                "team": models.Team.Tigers,
                "card_number": "RE-08",
                "rarity": models.Rarity.Rookie,
                "is_rookie": True,
                "image_front": IMG_MURAKAMI_FRONT,
                "image_back": IMG_MURAKAMI_BACK
            },
            {
                "manufacturer": models.Manufacturer.Epoch,
                "year": 2022,
                "series_name": "Premier",
                "player_name": "Masataka Yoshida",
                "team": models.Team.Buffaloes,
                "card_number": "P-07",
                "rarity": models.Rarity.Autograph,
                "is_rookie": False,
                "image_front": IMG_MURAKAMI_FRONT,
                "image_back": IMG_MURAKAMI_BACK
            },
            {
                "manufacturer": models.Manufacturer.BBM,
                "year": 1985,
                "series_name": "Historic",
                "player_name": "Randy Bass",
                "team": models.Team.Tigers,
                "card_number": "H-44",
                "rarity": models.Rarity.Legend,
                "is_rookie": False,
                "image_front": IMG_MURAKAMI_FRONT,
                "image_back": IMG_MURAKAMI_BACK
            }
        ]

        created_catalogs = []
        for item in catalog_data:
            # Extract images to separate variable to avoid kwargs error if model doesn't support it directly
            # (Assuming CardCatalog doesn't have image fields, ListingItem does)
            img_front = item.pop("image_front")
            img_back = item.pop("image_back")
            
            # Check if exists
            existing = db.query(models.CardCatalog).filter_by(
                player_name=item["player_name"], 
                series_name=item["series_name"]
            ).first()
            
            if not existing:
                catalog = models.CardCatalog(**item)
                db.add(catalog)
                db.commit()
                db.refresh(catalog)
                created_catalogs.append((catalog, img_front, img_back))
                print(f"Created catalog: {catalog.player_name}")
            else:
                created_catalogs.append((existing, img_front, img_back))
                print(f"Found existing catalog: {existing.player_name}")

        # 3. Create Listings for these catalogs
        for catalog, img_front, img_back in created_catalogs:
            # Create 1 listing per catalog item for the demo
            price = random.randint(10, 1000) * 100 # 1000 to 100,000 JPY
            
            listing = models.ListingItem(
                catalog_id=str(catalog.id),
                seller_id=str(uuid.uuid4()),
                price=price,
                status=models.ListingStatus.Active,
                images=[img_front, img_back], # Use the specific images
                condition_grading={
                    "is_graded": True,
                    "service": "PSA",
                    "score": random.choice([9, 9.5, 10]),
                    "certification_number": str(random.randint(10000000, 99999999))
                }
            )
            db.add(listing)
            print(f"Created listing for {catalog.player_name} at {price} JPY")
        
        db.commit()
        print("Seeding complete!")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
