import urllib.parse
import webbrowser
import time

# --- 設定 ---
# Next.jsが動いているURL（ローカル環境）
BASE_URL = "http://localhost:3000/admin/moments"

# --- 1. 仮想のイベントデータ (本来はここをAIやスクレイピングで作る) ---
mock_event = {
    "player": "Shohei Ohtani",
    "title": "55th Home Run",
    "desc": "打球速度110マイルの弾丸ライナー！前人未到の記録を更新。",
    "intensity": "5",       # 熱狂度 (1-5)
    "visitor": "LAD",       # チームコード (Next.js側の定義と合わせる)
    "home": "SD"
}

def generate_admin_url(data):
    """辞書データを受け取り、管理画面の自動入力URLを生成する"""
    query_string = urllib.parse.urlencode(data)
    full_url = f"{BASE_URL}?{query_string}"
    return full_url

if __name__ == "__main__":
    print("🤖 Watcher Bot: イベントを検知しました...")
    time.sleep(1) # 計算しているフリ
    
    # URL生成
    url = generate_admin_url(mock_event)
    
    print("\n" + "="*50)
    print("生成されたURL:")
    print(url)
    print("="*50 + "\n")
    
    # オプション: 自動でブラウザを開く（確認用）
    # 不要ならコメントアウトしてください
    print("ブラウザで開いています...")
    webbrowser.open(url)