import uuid
import enum
from sqlalchemy import Column, String, Integer, Boolean, Enum as SAEnum, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from .database import Base

# --- Enums ---
class Manufacturer(str, enum.Enum):
    BBM = "BBM"
    Calbee = "Calbee"
    Epoch = "Epoch"
    Topps_Japan = "Topps_Japan"

class Team(str, enum.Enum):
    Giants = "Giants"
    Tigers = "Tigers"
    Dragons = "Dragons"
    Swallows = "Swallows"
    Carp = "Carp"
    BayStars = "BayStars"
    Hawks = "Hawks"
    Fighters = "Fighters"
    Marines = "Marines"
    Buffaloes = "Buffaloes"
    Eagles = "Eagles"
    Lions = "Lions"

class Rarity(str, enum.Enum):
    Common = "Common"
    Rare = "Rare"
    Super_Rare = "Super Rare"
    Parallel = "Parallel"
    Autograph = "Autograph"
    Patch = "Patch"

class ListingStatus(str, enum.Enum):
    Draft = "Draft"
    Active = "Active"
    TransactionPending = "TransactionPending"
    AwaitingShipment = "AwaitingShipment"
    Shipped = "Shipped"
    Delivered = "Delivered"
    Completed = "Completed"
    Cancelled = "Cancelled"

# --- Models ---

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    year = Column(Integer, nullable=True)

class ListingItem(Base):
    __tablename__ = "listing_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    catalog_id = Column(String, ForeignKey("card_catalogs.id"), nullable=False)
    seller_id = Column(String, nullable=False)
    status = Column(SAEnum(ListingStatus), default=ListingStatus.Draft, nullable=False)
    price = Column(Integer, nullable=False)
    
    # SQLite対応のためJSON型を使用
    images = Column(JSON, nullable=False)
    condition_grading = Column(JSON, nullable=False)
    
    created_at = Column(String, default=lambda: str(uuid.uuid4()))
    updated_at = Column(String, default=lambda: str(uuid.uuid4()))

    catalog = relationship("CardCatalog")

class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    listing_id = Column(String, ForeignKey("listing_items.id"), nullable=False, unique=True)
    buyer_id = Column(String, nullable=False)
    payment_method_id = Column(String, nullable=False) # 決済トークン（今回はダミー）
    
    # 注文時の価格を記録（出品価格が変わっても履歴に残るように）
    total_amount = Column(Integer, nullable=False)
    
    # 追跡番号
    tracking_number = Column(String, nullable=True)
    
    created_at = Column(String, default=lambda: str(uuid.uuid4()))