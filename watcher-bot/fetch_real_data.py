import requests
import urllib.parse
import webbrowser
import json

# --- 設定 ---
NEXTJS_ADMIN_URL = "http://localhost:3000/admin/moments"

# ✅ 修正: 正真正銘の 50-50 達成試合 (2024/09/19 LAD vs MIA)
GAME_PK = 746024
OHTANI_ID = 660271

def fetch_game_data(game_pk):
    url = f"https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live"
    print(f"⚾ データを取得中... (Game ID: {game_pk})")
    resp = requests.get(url)
    return resp.json()

def find_homerun_play(game_data):
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
            # ループを回し続けることで、試合最後のHR（51号）を取得します
            target_play = play
            
    return target_play

def main():
    try:
        data = fetch_game_data(GAME_PK)
        
        # 試合情報の確認用ログ
        teams = data.get('gameData', {}).get('teams', {})
        print(f"Match: {teams.get('away', {}).get('name')} vs {teams.get('home', {}).get('name')}")

        play = find_homerun_play(data)
        
        if not play:
            print("❌ データが見つかりませんでした。")
            return

        # データの抽出
        result = play['result']
        matchup = play['matchup']
        
        # 名前取得 (APIにfullNameがない場合の保険付き)
        player_name = matchup['batter'].get('fullName', 'Shohei Ohtani')
        
        event_payload = {
            "player": player_name,
            "title": f"Event: {result['event']}",
            "desc": result['description'],
            "intensity": "5",
            "visitor": "LAD",
            "home": "MIA"
        }
        
        # URL生成
        query_string = urllib.parse.urlencode(event_payload)
        full_url = f"{NEXTJS_ADMIN_URL}?{query_string}"
        
        print("\n" + "="*50)
        print(f"🎉 伝説の瞬間を検出しました！")
        print(f"Play: {event_payload['desc']}")
        print("-" * 50)
        print("Generated URL:")
        print(full_url)
        print("="*50 + "\n")
        
        # ブラウザ起動
        webbrowser.open(full_url)
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")

if __name__ == "__main__":
    main()