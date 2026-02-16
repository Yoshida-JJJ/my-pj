import requests
import json

# 大谷 50-50 達成試合
GAME_PK = 746409 

def inspect_data():
    url = f"https://statsapi.mlb.com/api/v1.1/game/{GAME_PK}/feed/live"
    print(f"⚾ データを取得中... (Game ID: {GAME_PK})")
    
    try:
        resp = requests.get(url)
        data = resp.json()
        
        all_plays = data.get('liveData', {}).get('plays', {}).get('allPlays', [])
        
        print(f"取得できた総プレイ数: {len(all_plays)}")
        print("--------------------------------------------------")
        
        # 最初の10プレイだけ中身を詳しく表示する
        for i, play in enumerate(all_plays[:10]):
            matchup = play.get('matchup', {})
            batter = matchup.get('batter', {})
            result = play.get('result', {})
            
            print(f"Play {i}:")
            print(f"  - Event: {result.get('event')}")
            print(f"  - Batter Name (fullName): {batter.get('fullName')}")
            print(f"  - Batter ID: {batter.get('id')}")
            print(f"  - Desc: {result.get('description')}")
            print("--------------------------------------------------")
            
    except Exception as e:
        print(f"エラー: {e}")

if __name__ == "__main__":
    inspect_data()