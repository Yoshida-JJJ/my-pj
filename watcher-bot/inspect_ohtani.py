import requests
import json

GAME_PK = 746057  # LAD vs MIA (2024/09/19)

def inspect_ohtani_plays():
    url = f"https://statsapi.mlb.com/api/v1.1/game/{GAME_PK}/feed/live"
    print(f"⚾ データを解析中... (Game ID: {GAME_PK})")
    
    resp = requests.get(url)
    data = resp.json()
    all_plays = data.get('liveData', {}).get('plays', {}).get('allPlays', [])
    
    print(f"総プレイ数: {len(all_plays)}")
    print("--------------------------------------------------")
    print("🔍 'Ohtani' または 'Shohei' を含むプレイを抽出します")
    print("--------------------------------------------------")

    found_count = 0
    
    for i, play in enumerate(all_plays):
        # データの安全な取り出し
        result = play.get('result', {})
        matchup = play.get('matchup', {})
        batter = matchup.get('batter', {})
        
        batter_name = batter.get('fullName', 'Unknown')
        event_name = result.get('event', 'Unknown')
        description = result.get('description', 'No description')
        
        # 名前チェック（大谷選手かどうか）
        if 'Ohtani' in batter_name or 'Shohei' in batter_name:
            found_count += 1
            print(f"Play Index: {i}")
            print(f"  Player Name: '{batter_name}'")  # ここが重要（シングルクォートで囲って余計な空白がないか見る）
            print(f"  Event Name : '{event_name}'")   # ここも重要
            print(f"  Description: {description[:50]}...")
            print("--------------------------------------------------")

    if found_count == 0:
        print("❌ 'Ohtani' も 'Shohei' も含まれる選手が見つかりませんでした。")
        print("もしかして: 選手名がIDだけになっている可能性があります。")

if __name__ == "__main__":
    inspect_ohtani_plays()