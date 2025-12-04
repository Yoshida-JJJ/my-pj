
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(String, default=lambda: str(uuid.uuid4()))

class CardCatalog(Base):
    __tablename__ = "card_catalogs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    manufacturer = Column(SAEnum(Manufacturer), nullable=False)
    series_name = Column(String, nullable=True)
    player_name = Column(String, nullable=False, index=True)
    team = Column(SAEnum(Team), nullable=False)
    card_number = Column(String, nullable=True)
    rarity = Column(SAEnum(Rarity), nullable=True)
    is_rookie = Column(Boolean, default=False)
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