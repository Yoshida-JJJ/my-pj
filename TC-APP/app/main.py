from fastapi import FastAPI, Depends, Query, HTTPException, Path, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import shutil
import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from . import models, schemas, database, utils

load_dotenv()

# DBテーブル作成
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="Baseball Card Trading Platform API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://tc-app2.vercel.app",
        "https://tc-app-git-main-yoshida-jjjs-projects.vercel.app",
        "*" 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cloudinary Configuration
cloudinary.config( 
  cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
  api_key = os.getenv("CLOUDINARY_API_KEY"), 
  api_secret = os.getenv("CLOUDINARY_API_SECRET"),
  secure = True
)

# Static files mount (Keep for fallback or other static assets)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# --- Dependency ---
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Auth Endpoints ---
@app.post("/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = utils.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        name=user.name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=schemas.UserResponse)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not user:
        raise HTTPException(status_code=403, detail="Invalid credentials")
    
    if not utils.verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(status_code=403, detail="Invalid credentials")
        
    return user

# --- Catalog Endpoints ---
@app.get("/catalog/cards", response_model=List[schemas.CardCatalog])
def get_catalog_cards(
    q: Optional[str] = Query(None),
    team: Optional[models.Team] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.CardCatalog)
    if team:
        query = query.filter(models.CardCatalog.team == team)
    if year:
        query = query.filter(models.CardCatalog.year == year)
    if q:
        search = f"%{q}%"
        query = query.filter(
            (models.CardCatalog.player_name.ilike(search)) |
            (models.CardCatalog.series_name.ilike(search))
        )
    return query.all()

# --- Market Endpoints ---
@app.get("/market/listings", response_model=List[schemas.ListingItemResponse])
def get_market_listings(
    catalog_id: Optional[str] = Query(None),
    seller_id: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    team: Optional[models.Team] = Query(None),
    sort: Optional[str] = Query("newest"),
    db: Session = Depends(get_db)
):
    # Join with CardCatalog to filter by catalog attributes
    query = db.query(models.ListingItem).join(models.CardCatalog).filter(models.ListingItem.status == models.ListingStatus.Active)
    
    if catalog_id:
        query = query.filter(models.ListingItem.catalog_id == catalog_id)

    if seller_id:
        query = query.filter(models.ListingItem.seller_id == seller_id)

    if team:
        query = query.filter(models.CardCatalog.team == team)
        
    if q:
        search = f"%{q}%"
        query = query.filter(
            (models.CardCatalog.player_name.ilike(search)) |
            (models.CardCatalog.series_name.ilike(search))
        )
        
    if sort == "price_asc":
        query = query.order_by(models.ListingItem.price.asc())
    elif sort == "price_desc":
        query = query.order_by(models.ListingItem.price.desc())
    else:
        query = query.order_by(models.ListingItem.id.desc())
        
    return query.all()

@app.get("/market/listings/{listing_id}", response_model=schemas.ListingItemResponse)
def get_listing(listing_id: str, db: Session = Depends(get_db)):
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing

@app.post("/market/listings", response_model=schemas.ListingItemResponse, status_code=201)
def create_listing(
    item: schemas.ListingItemCreate,
    db: Session = Depends(get_db)
):
    if item.price < 100:
        raise HTTPException(status_code=400, detail="Price must be at least 100 JPY")
    if len(item.images) < 2:
        raise HTTPException(status_code=400, detail="At least 2 images are required")

    seller_id = item.seller_id if item.seller_id else str(uuid.uuid4())

    new_listing = models.ListingItem(
        catalog_id=str(item.catalog_id),
        seller_id=seller_id, 
        price=item.price,
        status=models.ListingStatus.Draft, # Default to Draft
        images=item.images,
        condition_grading=item.condition_grading.model_dump()
    )
    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)
    return new_listing

@app.post("/market/listings/{listing_id}/publish", response_model=schemas.ListingItemResponse)
def publish_listing(
    listing_id: str,
    db: Session = Depends(get_db)
):
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.status != models.ListingStatus.Draft:
        raise HTTPException(status_code=400, detail="Listing is not in Draft status")
    
    listing.status = models.ListingStatus.Active
    db.commit()
    db.refresh(listing)
    return listing

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(file.file, folder="tc-app")
        return {"url": result.get("secure_url")}
    except Exception as e:
        # Fallback to local storage if Cloudinary fails or is not configured
        print(f"Cloudinary upload failed: {e}. Falling back to local storage.")
        os.makedirs("app/static/uploads", exist_ok=True)
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = f"app/static/uploads/{unique_filename}"
        
        # Reset file pointer
        await file.seek(0)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"url": f"http://127.0.0.1:8000/static/uploads/{unique_filename}"}

@app.get("/market/orders", response_model=List[schemas.OrderResponse])
def get_market_orders(
    buyer_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Order)
    if buyer_id:
        query = query.filter(models.Order.buyer_id == buyer_id)
    
    orders = query.all()
    response = []
    for order in orders:
        listing = db.query(models.ListingItem).filter(models.ListingItem.id == order.listing_id).first()
        status = listing.status if listing else "Unknown"
        response.append(schemas.OrderResponse(
            id=order.id,
            listing_id=order.listing_id,
            buyer_id=order.buyer_id,
            status=status,
            total_amount=order.total_amount,
            tracking_number=order.tracking_number
        ))
    return response

@app.post("/market/orders", response_model=schemas.OrderResponse)
def create_order(
    order_data: schemas.OrderCreate,
    db: Session = Depends(get_db)
):
    # 1. 対象の出品を取得
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == str(order_data.listing_id)).first()

    # 2. 存在チェック
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # 3. ステータスチェック (State Machine: Active 以外は購入不可)
    if listing.status != models.ListingStatus.Active:
        raise HTTPException(
            status_code=409, # Conflict
            detail="Item is not available for purchase (Already sold or pending)"
        )

    # 4. トランザクション処理
    try:
        # ステータス更新: Active -> TransactionPending (在庫ロック)
        listing.status = models.ListingStatus.TransactionPending
        
        buyer_id = order_data.buyer_id if order_data.buyer_id else str(uuid.uuid4())
        
        # 注文レコード作成
        new_order = models.Order(
            listing_id=str(listing.id),
            buyer_id=buyer_id, 
            payment_method_id=order_data.payment_method_id,
            total_amount=listing.price
        )
        
        db.add(new_order)
        db.commit()
        db.refresh(new_order)
        
        return schemas.OrderResponse(
            id=new_order.id,
            listing_id=listing.id,
            buyer_id=new_order.buyer_id,
            status=listing.status,
            total_amount=new_order.total_amount,
            tracking_number=new_order.tracking_number
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- Transaction Flow Endpoints ---

@app.post("/market/orders/{order_id}/capture", response_model=schemas.OrderResponse)
def capture_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == order.listing_id).first()
    if listing.status != models.ListingStatus.TransactionPending:
         raise HTTPException(status_code=400, detail="Invalid status for capture")

    listing.status = models.ListingStatus.AwaitingShipment
    db.commit()
    return schemas.OrderResponse(
        id=order.id,
        listing_id=listing.id,
        buyer_id=order.buyer_id,
        status=listing.status,
        total_amount=order.total_amount,
        tracking_number=order.tracking_number
    )

@app.post("/market/orders/{order_id}/fail", response_model=schemas.OrderResponse)
def fail_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == order.listing_id).first()
    if listing.status != models.ListingStatus.TransactionPending:
         raise HTTPException(status_code=400, detail="Invalid status for failure")

    listing.status = models.ListingStatus.Active # Revert to Active
    # Note: In a real system, we might want to mark the order as failed instead of just reverting the listing
    db.commit()
    return schemas.OrderResponse(
        id=order.id,
        listing_id=listing.id,
        buyer_id=order.buyer_id,
        status=listing.status,
        total_amount=order.total_amount,
        tracking_number=order.tracking_number
    )

@app.post("/market/orders/{order_id}/ship", response_model=schemas.OrderResponse)
def ship_order(
    order_id: str, 
    shipment: schemas.ShipmentCreate,
    db: Session = Depends(get_db)
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == order.listing_id).first()
    if listing.status != models.ListingStatus.AwaitingShipment:
         raise HTTPException(status_code=400, detail="Invalid status for shipping")

    listing.status = models.ListingStatus.Shipped
    order.tracking_number = shipment.tracking_number
    db.commit()
    return schemas.OrderResponse(
        id=order.id,
        listing_id=listing.id,
        buyer_id=order.buyer_id,
        status=listing.status,
        total_amount=order.total_amount,
        tracking_number=order.tracking_number
    )

@app.post("/market/orders/{order_id}/deliver", response_model=schemas.OrderResponse)
def deliver_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == order.listing_id).first()
    if listing.status != models.ListingStatus.Shipped:
         raise HTTPException(status_code=400, detail="Invalid status for delivery")

    listing.status = models.ListingStatus.Delivered
    db.commit()
    return schemas.OrderResponse(
        id=order.id,
        listing_id=listing.id,
        buyer_id=order.buyer_id,
        status=listing.status,
        total_amount=order.total_amount,
        tracking_number=order.tracking_number
    )

@app.post("/market/orders/{order_id}/complete", response_model=schemas.OrderResponse)
def complete_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == order.listing_id).first()
    if listing.status != models.ListingStatus.Delivered:
         raise HTTPException(status_code=400, detail="Invalid status for completion")

    listing.status = models.ListingStatus.Completed
    db.commit()
    return schemas.OrderResponse(
        id=order.id,
        listing_id=listing.id,
        buyer_id=order.buyer_id,
        status=listing.status,
        total_amount=order.total_amount,
        tracking_number=order.tracking_number
    )

# --- Debug Endpoints ---
@app.get("/debug/db")
def debug_db(db: Session = Depends(get_db)):
    from sqlalchemy import text
    try:
        # Test connection
        db.execute(text("SELECT 1"))
        
        # Check tables (PostgreSQL specific query, fallback for SQLite if needed)
        try:
            tables = db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()
            table_names = [t[0] for t in tables]
        except:
            # Fallback for SQLite
            tables = db.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
            table_names = [t[0] for t in tables]
        
        # Check row counts
        counts = {}
        if "card_catalogs" in table_names:
            counts["card_catalogs"] = db.query(models.CardCatalog).count()
        if "listing_items" in table_names:
            counts["listing_items"] = db.query(models.ListingItem).count()
            
        return {
            "status": "ok",
            "tables": table_names,
            "counts": counts,
            "database_url_set": bool(os.getenv("DATABASE_URL"))
        }
    except Exception as e:
        return {
            "status": "error",
            "detail": str(e),
            "type": type(e).__name__
        }

@app.get("/debug/seed", include_in_schema=False)
def seed_data(db: Session = Depends(get_db)):
# 2. 存在チェック
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # 3. ステータスチェック (State Machine: Active 以外は購入不可)
    if listing.status != models.ListingStatus.Active:
        raise HTTPException(
            status_code=409, # Conflict
            detail="Item is not available for purchase (Already sold or pending)"
        )

    # 4. トランザクション処理
    try:
        # ステータス更新: Active -> TransactionPending (在庫ロック)
        listing.status = models.ListingStatus.TransactionPending
        
        buyer_id = order_data.buyer_id if order_data.buyer_id else str(uuid.uuid4())
        
        # 注文レコード作成
        new_order = models.Order(
            listing_id=str(listing.id),
            buyer_id=buyer_id, 
            payment_method_id=order_data.payment_method_id,
            total_amount=listing.price
        )
        
        db.add(new_order)
        db.commit()
        db.refresh(new_order)
        
        return schemas.OrderResponse(
            id=new_order.id,
            listing_id=listing.id,
            buyer_id=new_order.buyer_id,
            status=listing.status,
            total_amount=new_order.total_amount,
            tracking_number=new_order.tracking_number
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- Transaction Flow Endpoints ---

@app.post("/market/orders/{order_id}/capture", response_model=schemas.OrderResponse)
def capture_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == order.listing_id).first()
    if listing.status != models.ListingStatus.TransactionPending:
         raise HTTPException(status_code=400, detail="Invalid status for capture")

    listing.status = models.ListingStatus.AwaitingShipment
    db.commit()
    return schemas.OrderResponse(
        id=order.id,
        listing_id=listing.id,
        buyer_id=order.buyer_id,
        status=listing.status,
        total_amount=order.total_amount,
        tracking_number=order.tracking_number
    )

@app.post("/market/orders/{order_id}/fail", response_model=schemas.OrderResponse)
def fail_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == order.listing_id).first()
    if listing.status != models.ListingStatus.TransactionPending:
         raise HTTPException(status_code=400, detail="Invalid status for failure")

    listing.status = models.ListingStatus.Active # Revert to Active
    # Note: In a real system, we might want to mark the order as failed instead of just reverting the listing
    db.commit()
    return schemas.OrderResponse(
        id=order.id,
        listing_id=listing.id,
        buyer_id=order.buyer_id,
        status=listing.status,
        total_amount=order.total_amount,
        tracking_number=order.tracking_number
    )

@app.post("/market/orders/{order_id}/ship", response_model=schemas.OrderResponse)
def ship_order(
    order_id: str, 
    shipment: schemas.ShipmentCreate,
    db: Session = Depends(get_db)
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == order.listing_id).first()
    if listing.status != models.ListingStatus.AwaitingShipment:
         raise HTTPException(status_code=400, detail="Invalid status for shipping")

    listing.status = models.ListingStatus.Shipped
    order.tracking_number = shipment.tracking_number
    db.commit()
    return schemas.OrderResponse(
        id=order.id,
        listing_id=listing.id,
        buyer_id=order.buyer_id,
        status=listing.status,
        total_amount=order.total_amount,
        tracking_number=order.tracking_number
    )

@app.post("/market/orders/{order_id}/deliver", response_model=schemas.OrderResponse)
def deliver_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == order.listing_id).first()
    if listing.status != models.ListingStatus.Shipped:
         raise HTTPException(status_code=400, detail="Invalid status for delivery")

    listing.status = models.ListingStatus.Delivered
    db.commit()
    return schemas.OrderResponse(
        id=order.id,
        listing_id=listing.id,
        buyer_id=order.buyer_id,
        status=listing.status,
        total_amount=order.total_amount,
        tracking_number=order.tracking_number
    )

@app.post("/market/orders/{order_id}/complete", response_model=schemas.OrderResponse)
def complete_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    listing = db.query(models.ListingItem).filter(models.ListingItem.id == order.listing_id).first()
    if listing.status != models.ListingStatus.Delivered:
         raise HTTPException(status_code=400, detail="Invalid status for completion")

    listing.status = models.ListingStatus.Completed
    db.commit()
    return schemas.OrderResponse(
        id=order.id,
        listing_id=listing.id,
        buyer_id=order.buyer_id,
        status=listing.status,
        total_amount=order.total_amount,
        tracking_number=order.tracking_number
    )

# --- Debug Endpoints ---
@app.get("/debug/db")
def debug_db(db: Session = Depends(get_db)):
    from sqlalchemy import text
    try:
        # Test connection
        db.execute(text("SELECT 1"))
        
        # Check tables (PostgreSQL specific query, fallback for SQLite if needed)
        try:
            tables = db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()
            table_names = [t[0] for t in tables]
        except:
            # Fallback for SQLite
            tables = db.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
            table_names = [t[0] for t in tables]
        
        # Check row counts
        counts = {}
        if "card_catalogs" in table_names:
            counts["card_catalogs"] = db.query(models.CardCatalog).count()
        if "listing_items" in table_names:
            counts["listing_items"] = db.query(models.ListingItem).count()
            
        return {
            "status": "ok",
            "tables": table_names,
            "counts": counts,
            "database_url_set": bool(os.getenv("DATABASE_URL"))
        }
    except Exception as e:
        return {
            "status": "error",
            "detail": str(e),
            "type": type(e).__name__
        }

@app.get("/debug/seed", include_in_schema=False)
def seed_data(db: Session = Depends(get_db)):
    # Import here to avoid circular imports if any
    from seed_db import seed_db
    try:
        seed_db()
        return {"message": "Database seeded successfully!"}
    except Exception as e:
        return {"message": f"Seeding failed: {str(e)}"}

@app.get("/debug/validate_listings")
def debug_validate_listings(db: Session = Depends(get_db)):
    try:
        items = db.query(models.ListingItem).join(models.CardCatalog).all()
        results = []
        for item in items:
            try:
                # Manually validate against schema
                schema_item = schemas.ListingItemResponse.model_validate(item)
                results.append({"id": item.id, "status": "valid"})
            except Exception as e:
                results.append({"id": item.id, "status": "invalid", "error": str(e)})
        return results
    except Exception as e:
        return {"error": str(e)}