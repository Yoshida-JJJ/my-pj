# 監視対象の選手リスト (2025-2026シーズン最新版)
# IDはMLB公式 (statsapi.mlb.com / mlb.com) のPerson IDを使用

WATCH_LIST = [
    # --- 🇺🇸 2025/2026 新加入・注目選手 ---
    {"id": 808963, "name": "佐々木朗希", "team_code": "LAD"},  # Dodgers
    {"id": 608372, "name": "菅野智之", "team_code": "BAL"},    # Orioles
    {"id": 672960, "name": "岡本和真", "team_code": "TOR"},    # Blue Jays
    {"id": 808959, "name": "村上宗隆", "team_code": "CWS"},    # White Sox
    {"id": 829272, "name": "小笠原慎之介", "team_code": "WSH"},# Nationals

    # --- 🌟 メジャー定着・主力選手 ---
    {"id": 660271, "name": "大谷翔平", "team_code": "LAD"},    # Dodgers
    {"id": 808967, "name": "山本由伸", "team_code": "LAD"},    # Dodgers
    {"id": 506433, "name": "ダルビッシュ有", "team_code": "SD"}, # Padres
    {"id": 673548, "name": "鈴木誠也", "team_code": "CHC"},    # Cubs
    {"id": 684007, "name": "今永昇太", "team_code": "CHC"},    # Cubs
    {"id": 807799, "name": "吉田正尚", "team_code": "BOS"},    # Red Sox
    {"id": 673540, "name": "千賀滉大", "team_code": "NYM"},    # Mets
    {"id": 579328, "name": "菊池雄星", "team_code": "LAA"},    # Angels (2025移籍)
    {"id": 673451, "name": "松井裕樹", "team_code": "SD"},     # Padres
    {"id": 628317, "name": "前田健太", "team_code": "DET"},    # Tigers

    # --- 🇯🇵 侍ジャパン / 日系選手 ---
    {"id": 663457, "name": "ラーズ・ヌートバー", "team_code": "STL"}, # Cardinals

    # --- ⚠️ マイナー/招待選手など (必要に応じてコメントアウト解除) ---
    # {"id": 642547, "name": "藤浪晋太郎", "team_code": "SEA"}, # Mariners (Minors)
]