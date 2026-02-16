import requests
import urllib.parse
import webbrowser
import json

# --- 設定 ---
NEXTJS_ADMIN_URL = "http://localhost:3000/admin/moments"
TARGET_DATE = "2024-09-19" # 50-50 達成日 (現地時間)
OHTANI_ID = 660271

def find_game_pk(date_str):
    """
    指定された日付のスケジュールから、ドジャース(LAD)の試合IDを検索する
    """
    url = f"https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={date_str}"
    print(f"📅 {date_str} の試合日程を検索中...")
    
    resp = requests.get(url)
    data = resp.json()
    
    dates = data.get('dates', [])
    if not dates:
        print("❌ 指定日の試合データがありません。")
        return None
        
    games = dates[0].get('games', [])
    for game in games:
        away = game['teams']['away']['team']['name']
        home = game['teams']['home']['team']['name']
        pk = game['gamePk']
        
        print(f"  - 候補: {away} vs {home} (ID: {pk})")
        
        # ドジャース戦を探す
        if 'Dodgers' in away or 'Dodgers' in home:
            print(f"✅ ドジャース戦を発見しました！ ID: {pk}")
            return pk
            
    print("❌ ドジャースの試合が見つかりませんでした。")
    return None

def find_homerun_play(game_pk):
    url = f"https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live"
    print(f"⚾ 試合データを取得中... (Game ID: {game_pk})")
    
    resp = requests.get(url)
    game_data = resp.json()
    
    all_plays = game_data.get('liveData', {}).get('plays', {}).get('allPlays', [])
    print(f"総プレイ数: {len(all_plays)}")
    
    target_play = None
    hr_count = 0

    for play in all_plays:
        matchup = play.get('matchup', {})
        batter = matchup.get('batter', {})
        result = play.get('result', {})
        
        batter_id = batter.get('id')
        event = result.get('event', '')
        
        # 大谷選手のホームランを探す
        if batter_id == OHTANI_ID and 'Home Run' in event:
            hr_count += 1
            print(f"🔥 大谷選手のホームラン({hr_count}本目)を発見！: {result.get('description')[:30]}...")
            # 50号、51号と続くので、最後のデータを採用（上書き）
            target_play = play
            
    return target_play

def main():
    # 1. まず正しいGame IDを日程から探す
    game_pk = find_game_pk(TARGET_DATE)
    if not game_pk:
        return

    # 2. そのIDを使ってプレイデータを探す
    play = find_homerun_play(game_pk)
    
    if not play:
        print("❌ 大谷選手のホームランが見つかりませんでした。")
        return

    # 3. データ抽出とURL生成
    result = play['result']
    matchup = play['matchup']
    player_name = matchup['batter'].get('fullName', 'Shohei Ohtani')
    
    event_payload = {
        "player": player_name,
        "title": f"Event: {result['event']}",
        "desc": result['description'],
        "intensity": "5",
        "visitor": "LAD",
        "home": "MIA"
    }
    
    query_string = urllib.parse.urlencode(event_payload)
    full_url = f"{NEXTJS_ADMIN_URL}?{query_string}"
    
    print("\n" + "="*50)
    print(f"🎉 伝説の瞬間を検出しました！")
    print(f"Play: {event_payload['desc']}")
    print("-" * 50)
    print("Generated URL:")
    print(full_url)
    print("="*50 + "\n")
    
    print("ブラウザを起動します...")
    webbrowser.open(full_url)

if __name__ == "__main__":
    main()