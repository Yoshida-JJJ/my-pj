-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE USING (auth.uid() = id);

-- Listing Items Policies
CREATE POLICY "Public listings are viewable by everyone" 
ON listing_items FOR SELECT 
USING (status IN ('Active', 'Display', 'Sold', 'Shipped', 'Delivered', 'Completed', 'TransactionPending', 'AwaitingShipment'));

CREATE POLICY "Users can view their own draft/all listings" 
ON listing_items FOR SELECT 
USING (auth.uid() = seller_id);

CREATE POLICY "Users can insert their own listings" 
ON listing_items FOR INSERT 
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own listings" 
ON listing_items FOR UPDATE 
USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete their own listings" 
ON listing_items FOR DELETE 
USING (auth.uid() = seller_id);

-- Orders Policies
-- Buyer can view their orders
CREATE POLICY "Buyers can view their own orders" 
ON orders FOR SELECT 
USING (auth.uid() = buyer_id);

-- Seller can view orders for their items (via listing_items)
CREATE POLICY "Sellers can view orders for their items" 
ON orders FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM listing_items 
        WHERE listing_items.id = orders.listing_id 
        AND listing_items.seller_id = auth.uid()
    )
);

-- Buyers can create orders
CREATE POLICY "Buyers can create orders" 
ON orders FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

-- Updates are generally handled by system/RPC, but allowing status updates by participants if needed
-- For now, restricting updates to explicit cases or keeping it open to participants
CREATE POLICY "Participants can update orders" 
ON orders FOR UPDATE 
USING (
    auth.uid() = buyer_id OR 
    EXISTS (
        SELECT 1 FROM listing_items 
        WHERE listing_items.id = orders.listing_id 
        AND listing_items.seller_id = auth.uid()
    )
);
