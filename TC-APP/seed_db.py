import sys
import os
import uuid
import random

# Add current directory to path so we can import app modules
sys.path.append(os.getcwd())

from app import models, database
from sqlalchemy.orm import Session

def seed_db():
    db = database.SessionLocal()
    try:
        print("Seeding database...")
        
        # 1. Clear existing data (Optional, but good for clean state)
        # db.query(models.Order).delete()
        # db.query(models.ListingItem).delete()
        # db.query(models.CardCatalog).delete()
        # db.commit()

        # 2. Create Catalog Items
        catalog_data = [
            {
                "manufacturer": models.Manufacturer.BBM,
                "year": 2024,
                "series_name": "Genesis",
                "player_name": "佐藤輝明",
                "team": models.Team.Tigers,
                "card_number": "G-05",
                "rarity": models.Rarity.Rare,
                "is_rookie": False
            },
            {
                "manufacturer": models.Manufacturer.Calbee,
                "year": 2024,
                "series_name": "Pro Baseball Chips",
                "player_name": "岡本和真",
                "team": models.Team.Giants,
                "card_number": "C-01",
                "rarity": models.Rarity.Rare,
                "is_rookie": False
            },
            {
                "manufacturer": models.Manufacturer.Epoch,
                "year": 2023,
                "series_name": "Stars & Legends",
                "player_name": "村上宗隆",
                "team": models.Team.Swallows,
                "card_number": "SL-55",
                "rarity": models.Rarity.Autograph,
                "is_rookie": False
            },
            {
                "manufacturer": models.Manufacturer.Topps_Japan,
                "year": 2024,
                "series_name": "Chrome",
                "player_name": "佐々木朗希",
                "team": models.Team.Marines,
                "card_number": "TC-17",
                "rarity": models.Rarity.Parallel,
                "is_rookie": False
            },
            {
                "manufacturer": models.Manufacturer.BBM,
                "year": 2024,
                "series_name": "Rookie Edition",
                "player_name": "森下翔太",
                "team": models.Team.Tigers,
                "card_number": "RE-01",
                "rarity": models.Rarity.Common,
                "is_rookie": True
            }
        ]

        created_catalogs = []
        for item in catalog_data:
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
                created_catalogs.append(catalog)
                print(f"Created catalog: {catalog.player_name}")
            else:
                created_catalogs.append(existing)
                print(f"Found existing catalog: {existing.player_name}")

        # 3. Create Listings for these catalogs
        for catalog in created_catalogs:
            # Create 1-3 listings per catalog item
            for _ in range(random.randint(1, 3)):
                price = random.randint(10, 500) * 100 # 1000 to 50000 JPY
                
                listing = models.ListingItem(
                    catalog_id=str(catalog.id),
                    seller_id=str(uuid.uuid4()),
                    price=price,
                    status=models.ListingStatus.Active, # Directly Active
                    images=["https://placehold.co/400x600"],
                    condition_grading={
                        "is_graded": False,
                        "service": "None"
                    }
                )
                db.add(listing)
                print(f"Created listing for {catalog.player_name} at {price} JPY")
        
        db.commit()
        print("Seeding complete!")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
