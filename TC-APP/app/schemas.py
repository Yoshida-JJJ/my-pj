from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from .models import Manufacturer, Team, Rarity

# --- User Schemas ---
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str
    name: Optional[str] = None

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Catalog Schemas ---
class CardCatalogBase(BaseModel):
    manufacturer: Manufacturer
    year: int
    series_name: Optional[str] = None
    player_name: str
    team: Team
    card_number: Optional[str] = None
    rarity: Optional[Rarity] = None
    is_rookie: bool = False

class CardCatalog(CardCatalogBase):
    id: str
    model_config = ConfigDict(from_attributes=True)

# --- Listing Schemas ---
class ConditionGrading(BaseModel):
    is_graded: bool = False
    service: str
    score: Optional[float] = None
    certification_number: Optional[str] = None

class ListingItemBase(BaseModel):
    catalog_id: str
    price: int
    images: List[str]
    condition_grading: ConditionGrading

class ListingItemCreate(ListingItemBase):
    seller_id: Optional[str] = None

class ListingItemResponse(ListingItemBase):
    id: str
    seller_id: str
    status: str
    catalog: CardCatalog
    
    model_config = ConfigDict(from_attributes=True)

# --- Order Schemas ---
class OrderCreate(BaseModel):
    listing_id: str
    payment_method_id: str
    buyer_id: Optional[str] = None

class ShipmentCreate(BaseModel):
    tracking_number: str

class OrderResponse(BaseModel):
    id: str
    listing_id: str
    buyer_id: str
    status: str # 注文後の出品ステータス
    total_amount: int
    tracking_number: Optional[str] = None
    listing: Optional[ListingItemResponse] = None
    
    model_config = ConfigDict(from_attributes=True)