import requests
import json

BASE_URL = "https://baseball-card-api.onrender.com"

def check_listings():
    url = f"{BASE_URL}/market/listings"
    try:
        print(f"Fetching from: {url}")
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Count: {len(data)}")
            if len(data) > 0:
                print("First item sample:")
                print(json.dumps(data[0], indent=2, ensure_ascii=False))
            else:
                print("No listings found.")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    check_listings()
