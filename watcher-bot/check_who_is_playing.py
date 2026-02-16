import requests
import json

# 2024/09/19 LAD vs MIA のはず...
GAME_PK = 746057

def check_players():
    url = f"https://statsapi.mlb.com/api/v1.1/game/{GAME_PK}/feed/live"
    print(f"⚾ データ取得中... (Game ID: {GAME_PK})")
    
    resp = requests.get(url)
    data = resp.json()
    
    # 試合の日時や会場情報を確認
    game_data = data.get('gameData', {})
    datetime = game_data.get('datetime', {})
    venue = game_data.get('venue', {})
    teams = game_data.get('teams', {})
    
    print("\n=== 🏟️ 試合情報確認 ===")
    print(f"Date: {datetime.get('dateTime')} (Official Date: {datetime.get('officialDate')})")
    print(f"Venue: {venue.get('name')}")
    print(f"Away Team: {teams.get('away', {}).get('name')}")
    print(f"Home Team: {teams.get('home', {}).get('name')}")
    print("========================\n")

    # プレイデータの確認
    all_plays = data.get('liveData', {}).get('plays', {}).get('allPlays', [])
    print(f"総プレイ数: {len(all_plays)}")
    print("\n--- 📝 全打席リスト (最初の20件) ---")

    for i, play in enumerate(all_plays[:20]): # 長いので最初の20件だけ
        matchup = play.get('matchup', {})
        batter = matchup.get('batter', {})
        result = play.get('result', {})
        
        b_id = batter.get('id', 'No ID')
        b_name = batter.get('fullName', 'No Name')
        event = result.get('event', 'No Event')
        
        print(f"[{i}] ID:{b_id} | {b_name} -> {event}")

    # 大谷選手のID (660271) がデータ全体のどこかに含まれているか文字列検索
    print("\n--- 🔍 データ全体のスキャン ---")
    raw_text = json.dumps(data)
    if "660271" in raw_text:
        print("✅ ID '660271' (Ohtani) はデータ内に存在します！")
        print("-> データの構造（パス）が想定と違っているようです。")
    else:
        print("❌ ID '660271' (Ohtani) はデータ内に一切存在しません。")
        print("-> 試合IDが間違っているか、出場していない試合です。")

if __name__ == "__main__":
    check_players()