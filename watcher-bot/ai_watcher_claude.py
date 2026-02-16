import requests
import urllib.parse
import webbrowser
import anthropic
import json
import re
import time
from datetime import datetime, timedelta
import pytz
from players import WATCH_LIST

# --- 🔧 設定エリア ------------------------------------------------
#ローカル環境のURL
NEXTJS_ADMIN_URL = "http://localhost:3000/admin/moments"
#ステージング環境のURL
#NEXTJS_ADMIN_URL = "http://stg.bigluck-stadium.jp/admin/moments"
# 本番/ステージング環境のURL
#NEXTJS_ADMIN_URL = "https://bigluck-stadium.jp/admin/moments"

# Anthropic APIキー (sk-ant-...)
ANTHROPIC_API_KEY = "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"

# テスト設定 (Trueの場合、TEST_TARGET_DATEの試合を強制的に見に行きます)
IS_TEST_MODE = True
TEST_TARGET_DATE = "2025-11-01" 
# ------------------------------------------------------------------

TEAM_MAP_PARTIAL = {
    "Dodgers": "LAD", "Marlins": "MIA", "Padres": "SD", "Yankees": "NYY",
    "Cubs": "CHC", "Angels": "LAA", "Red Sox": "BOS", "Mets": "NYM",
    "Braves": "ATL", "Phillies": "PHI", "Giants": "SF", "Rockies": "COL",
    "Diamondbacks": "AZ", "Rays": "TB", "Blue Jays": "TOR", "Orioles": "BAL",
    "White Sox": "CWS", "Royals": "KC", "Tigers": "DET", "Twins": "MIN",
    "Guardians": "CLE", "Mariners": "SEA", "Astros": "HOU", "Rangers": "TEX",
    "Athletics": "OAK", "Nationals": "WSH", "Pirates": "PIT", "Cardinals": "STL",
    "Brewers": "MIL", "Reds": "CIN"
}

# 🔥 Claudeクライアントの初期化
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
WATCH_IDS = {p['id']: p for p in WATCH_LIST}

def get_current_mlb_date():
    tz = pytz.timezone('US/Eastern')
    now = datetime.now(tz)
    return now.strftime('%Y-%m-%d')

def resolve_team_code(team_name):
    for key, code in TEAM_MAP_PARTIAL.items():
        if key in team_name:
            return code
    return "UNKNOWN"

def to_ordinal(n):
    try: n = int(n)
    except: return str(n)
    if 11 <= (n % 100) <= 13: suffix = 'th'
    else: suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')
    return f"{n}{suffix}"

def to_form_progress(inning_raw, half_raw):
    if str(inning_raw) == 'Final' or str(half_raw) == 'Final': return 'Final'
    if not inning_raw: return ""
    inning_ord = to_ordinal(inning_raw)
    side = "Bot" if str(half_raw).lower() == 'bottom' else "Top"
    return f"{side} {inning_ord}"

def map_event_type_to_form(event_eng):
    event_upper = event_eng.upper()
    if 'HOME RUN' in event_upper: return 'HOMERUN'
    if 'STRIKEOUT' in event_upper: return 'STRIKEOUT'
    if 'DOUBLE' in event_upper or 'TRIPLE' in event_upper or 'SINGLE' in event_upper or 'HIT' in event_upper: return 'TIMELY'
    if 'GAME END' in event_upper or 'VICTORY' in event_upper: return 'VICTORY'
    return 'BIG_PLAY'

def is_risp(play_data):
    runners = play_data.get('runners', [])
    for runner in runners:
        origin = runner.get('movement', {}).get('originBase', '')
        if origin in ['2B', '3B']:
            return True
    return False

# 🔥 ClaudeによるAI審判機能
def judge_impact_by_ai(player_name, description, context_str):
    print(f"  ⚖️ Claude審判が判定中: {description} ({context_str})")
    
    prompt = f"""
    Player: {player_name}
    Play: "{description}"
    Context: {context_str}

    あなたはプロ野球ニュースの編集長です。上記のプレイを「トレーディングカード化（ニュース速報）」すべきか判定してください。

    # 判定ロジック (Priority Order)
    1. 【Context: Postseason / World Series の場合】
       - Hit (Single, Double, Triple, Home Run) -> **YES**
       - RBI (Run Batted In) -> **YES**
       - Pitcher's Strikeout -> **YES**
       - Great Defensive Play -> **YES**
       - **重要:** 得点が入っていない平凡なアウト (Ground/Fly/Pop out) -> **NO**
    
    2. 【Context: Inning 9+ AND ScoreDiff <= 1 (クライマックス)】
       - 凡退であっても「決着の瞬間」や「痛恨の凡退」なら -> **YES**

    3. 【上記以外 (Regular Season etc)】
       - 明確なハイライトのみ -> **YES**
       - それ以外 -> **NO**

    回答は "YES" か "NO" のみで答えてください。余計な説明は不要です。
    """
    
    try:
        # Claude API Call
        message = client.messages.create(
            # 🔥 修正: Claude Sonnet 4.5 を指定
            model="claude-sonnet-4-5-20250929", 
            max_tokens=100,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        answer = message.content[0].text.strip().upper()
        
        if "YES" in answer:
            print("  ✅ Claude判定: 採用 (YES)")
            return True
        else:
            print("  🗑️ Claude判定: 却下 (NO)")
            return False
    except Exception as e:
        print(f"  ⚠️ Claude判定エラー: {e}")
        return False

def is_critical_moment(event, play_data, inning, score_diff, game_type, player_name, description):
    if 'Game End' in event: return True
    is_postseason = game_type not in ['R', 'S', 'E']
    is_close_game = (score_diff <= 2)
    is_scoring_position = is_risp(play_data)

    if is_close_game and is_scoring_position:
        print(f"  ⚡️ ルール判定: 接戦ピンチのため採用")
        return True

    if is_postseason or score_diff <= 3:
        context_str = f"GameType: {game_type}, Inning: {inning}, ScoreDiff: {score_diff}"
        if judge_impact_by_ai(player_name, description, context_str):
            return True
    return False

# 🔥 Claudeによる記事生成機能
def get_japanese_content(english_desc, event_type, player_name, score_str):
    print(f"🖋️ Claudeが {player_name} ({event_type}) の記事を執筆中...")
    
    system_prompt = "あなたはプロ野球トレーディングカードの敏腕編集者です。ファンが熱狂するようなテキストを作成してください。出力はJSON形式のみとしてください。"
    
    user_prompt = f"""
    MLB実況データ（英語）を元に、日本語のトレーディングカード風テキストを作成してください。
    Target: {player_name} / Event: {event_type} / Desc: "{english_desc}" / Score: {score_str}

    # 要件
    1. Title: 20文字以内の劇的でキャッチーなタイトル。体言止め推奨。
    2. Desc: 60文字程度の状況描写。情景が浮かぶようなエモーショナルな表現で。
    3. Intensity: 1〜5の熱量スコア（5が最高）。

    # 出力フォーマット (JSONのみ)
    {{ "title": "...", "desc": "...", "intensity": "..." }}
    """
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Claude API Call
            message = client.messages.create(
                # 🔥 修正: Claude Sonnet 4.5 を指定
                model="claude-sonnet-4-5-20250929",
                max_tokens=1000,
                temperature=0.7,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            text = message.content[0].text
            
            # JSON抽出ロジック
            start = text.find('{')
            end = text.rfind('}')
            
            if start != -1 and end != -1:
                data = json.loads(text[start : end+1])
                
                if 'title' not in data and 'Title' in data: data['title'] = data.pop('Title')
                if 'desc' not in data and 'Desc' in data: data['desc'] = data.pop('Desc')
                if 'desc' not in data and 'description' in data: data['desc'] = data.pop('description')
                if 'intensity' not in data: data['intensity'] = '3'

                if 'title' in data and 'desc' in data:
                    return data
                else:
                    raise ValueError("JSON keys missing")
                    
        except Exception as e:
            time.sleep(1)
            
    print(f"  ❌ Claude生成失敗。原文を使用します。")
    return {"title": event_type, "desc": english_desc, "intensity": "3"}

def send_to_admin(player_name, event_type, desc, away_team, home_team, away_score, home_score, progress):
    ai_content = get_japanese_content(desc, event_type, player_name, f"{away_score}-{home_score}")
    
    payload = {
        "player": player_name,
        "title": ai_content.get('title', event_type),
        "type": event_type, 
        "desc": ai_content.get('desc', desc),
        "intensity": ai_content.get('intensity', '3'),
        "visitor": resolve_team_code(away_team),
        "home": resolve_team_code(home_team),
        "visitorScore": away_score,
        "homeScore": home_score,
        "progress": progress
    }
    
    full_url = f"{NEXTJS_ADMIN_URL}?{urllib.parse.urlencode(payload)}"
    print(f"🚀 管理画面を起動中...")
    webbrowser.open(full_url)
    time.sleep(3)

def check_games_for_highlights():
    target_date = TEST_TARGET_DATE if IS_TEST_MODE else get_current_mlb_date()
    print(f"📅 {target_date} の試合をスキャン中...")
    
    try:
        sched = requests.get(f"https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={target_date}").json()
    except Exception as e:
        print(f"❌ 日程取得エラー: {e}")
        return

    dates = sched.get('dates', [])
    if not dates:
        print("💤 指定日に試合データがありません")
        return

    for game in dates[0]['games']:
        game_pk = game['gamePk']
        game_type = game.get('gameType', 'R')
        away_team = game['teams']['away']['team']['name']
        home_team = game['teams']['home']['team']['name']
        
        try:
            feed = requests.get(f"https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live").json()
        except: continue

        live_data = feed.get('liveData', {})
        all_plays = live_data.get('plays', {}).get('allPlays', [])
        linescore = live_data.get('linescore', {})
        decisions = live_data.get('decisions', {})
        
        home_runs_total = linescore.get('teams', {}).get('home', {}).get('runs', 0)
        away_runs_total = linescore.get('teams', {}).get('away', {}).get('runs', 0)
        score_diff = abs(home_runs_total - away_runs_total)

        for play in all_plays:
            matchup = play.get('matchup', {})
            result = play.get('result', {})
            event = result.get('event', '')
            about = play.get('about', {})
            
            current_inning_num = about.get('inning', 0)
            play_progress = to_form_progress(current_inning_num, about.get('halfInning', 'top'))
            form_event_type = map_event_type_to_form(event)
            
            batter_id = matchup.get('batter', {}).get('id')
            pitcher_id = matchup.get('pitcher', {}).get('id')
            target_player_name = None
            
            if batter_id in WATCH_IDS:
                player_name = WATCH_IDS[batter_id]['name']
                if is_critical_moment(event, play, current_inning_num, score_diff, game_type, player_name, result['description']):
                     target_player_name = player_name
            elif pitcher_id in WATCH_IDS:
                player_name = WATCH_IDS[pitcher_id]['name']
                if is_critical_moment(event, play, current_inning_num, score_diff, game_type, player_name, result['description']):
                     target_player_name = player_name

            if target_player_name:
                print(f"\n🔥 ハイライト発見: {target_player_name} / {form_event_type}")
                send_to_admin(target_player_name, form_event_type, result['description'], away_team, home_team, away_runs_total, home_runs_total, play_progress)

        if 'Final' in linescore.get('inningState', '') or game.get('status', {}).get('abstractGameState') == 'Final':
            if 'winner' in decisions:
                win_id = decisions['winner']['id']
                if win_id in WATCH_IDS:
                    p_name = WATCH_IDS[win_id]['name']
                    print(f"\n🏆 勝利投手検知: {p_name}")
                    send_to_admin(p_name, "VICTORY", f"{p_name} earns the win!", away_team, home_team, away_runs_total, home_runs_total, "Final")
            
            if 'save' in decisions:
                save_id = decisions['save']['id']
                if save_id in WATCH_IDS:
                    p_name = WATCH_IDS[save_id]['name']
                    print(f"\n🔐 セーブ投手検知: {p_name}")
                    send_to_admin(p_name, "VICTORY", f"{p_name} records the save!", away_team, home_team, away_runs_total, home_runs_total, "Final")

if __name__ == "__main__":
    check_games_for_highlights()