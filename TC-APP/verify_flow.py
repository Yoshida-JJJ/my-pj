from fastapi.testclient import TestClient
from app.main import app
import uuid

client = TestClient(app)

def verify_flow():
    print("Starting Transaction Flow Verification...")

    # 1. Get Catalog Item
    print("\n[1] Getting Catalog...")
    response = client.get("/catalog/cards")
    assert response.status_code == 200
    catalog = response.json()
    assert len(catalog) > 0
    catalog_item = catalog[0]
    print(f"Selected Catalog Item: {catalog_item['player_name']} ({catalog_item['id']})")

    # 2. Create Listing (Draft)
    print("\n[2] Creating Listing (Draft)...")
    listing_data = {
        "catalog_id": catalog_item['id'],
        "price": 5000,
        "images": ["http://example.com/front.jpg", "http://example.com/back.jpg"],
        "condition_grading": {
            "is_graded": False,
            "service": "Raw"
        }
    }
    response = client.post("/market/listings", json=listing_data)
    assert response.status_code == 201
    listing = response.json()
    assert listing['status'] == "Draft"
    listing_id = listing['id']
    print(f"Created Listing: {listing_id} (Status: {listing['status']})")

    # 3. Publish Listing
    print("\n[3] Publishing Listing...")
    response = client.post(f"/market/listings/{listing_id}/publish")
    assert response.status_code == 200
    listing = response.json()
    assert listing['status'] == "Active"
    print(f"Published Listing: {listing['status']}")

    # 4. Create Order
    print("\n[4] Creating Order...")
    order_data = {
        "listing_id": listing_id,
        "payment_method_id": "tok_visa"
    }
    response = client.post("/market/orders", json=order_data)
    assert response.status_code == 200
    order = response.json()
    assert order['status'] == "TransactionPending"
    order_id = order['id']
    print(f"Created Order: {order_id} (Status: {order['status']})")

    # 5. Capture Payment
    print("\n[5] Capturing Payment...")
    response = client.post(f"/market/orders/{order_id}/capture")
    assert response.status_code == 200
    order = response.json()
    assert order['status'] == "AwaitingShipment"
    print(f"Captured Payment. Status: {order['status']}")

    # 6. Ship Order
    print("\n[6] Shipping Order...")
    shipment_data = {
        "tracking_number": "1234-5678-9012"
    }
    response = client.post(f"/market/orders/{order_id}/ship", json=shipment_data)
    assert response.status_code == 200
    order = response.json()
    assert order['status'] == "Shipped"
    assert order['tracking_number'] == "1234-5678-9012"
    print(f"Shipped Order. Status: {order['status']}, Tracking: {order['tracking_number']}")

    # 7. Deliver Order
    print("\n[7] Delivering Order...")
    response = client.post(f"/market/orders/{order_id}/deliver")
    assert response.status_code == 200
    order = response.json()
    assert order['status'] == "Delivered"
    print(f"Delivered Order. Status: {order['status']}")

    # 8. Complete Order
    print("\n[8] Completing Order...")
    response = client.post(f"/market/orders/{order_id}/complete")
    assert response.status_code == 200
    order = response.json()
    assert order['status'] == "Completed"
    print(f"Completed Order. Status: {order['status']}")

    print("\nVerification Successful! All steps passed.")

if __name__ == "__main__":
    verify_flow()
