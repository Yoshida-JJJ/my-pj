import sys
import os

# プロジェクトルートのパスを解決して app モジュールをインポートできるようにする
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app import models
from app.models import CardCatalog, Manufacturer, Team, Rarity

def seed_data():
    db = SessionLocal()

    # 既存データをクリア（テスト用：本番では注意）
    try:
        db.query(CardCatalog).delete()
        db.commit()
        print("既存のデータを削除しました。")
    except Exception as e:
        print(f"データ削除中にエラー: {e}")
        db.rollback()

    # 投入するデータリスト
    cards = [
        # --- 阪神タイガース (Tigers) ---
        CardCatalog(
            manufacturer=Manufacturer.BBM,
            year=2024,
            series_name="Genesis",
            player_name="佐藤輝明",
            team=Team.Tigers,
            card_number="G-05",
            rarity=Rarity.Rare,
            is_rookie=False
        ),
        CardCatalog(
            manufacturer=Manufacturer.Topps_Japan,
            year=2024,
            series_name="Chrome",
            player_name="近本光司",
            team=Team.Tigers,
            card_number="TC-10",
            rarity=Rarity.Common,
            is_rookie=False
        ),

        # --- 読売ジャイアンツ (Giants) ---
        CardCatalog(
            manufacturer=Manufacturer.BBM,
            year=2024,
            series_name="Glory",
            player_name="岡本和真",
            team=Team.Giants,
            card_number="GL-01",
            rarity=Rarity.Super_Rare,
            is_rookie=False
        ),
        CardCatalog(
            manufacturer=Manufacturer.Epoch,
            year=2024,
            series_name="Stars & Legends",
            player_name="阿部慎之助",
            team=Team.Giants,
            card_number="SL-88",
            rarity=Rarity.Autograph, # サインカード
            is_rookie=False
        ),

        # --- 東京ヤクルトスワローズ (Swallows) ---
        CardCatalog(
            manufacturer=Manufacturer.BBM,
            year=2023, # 去年のデータも混ぜる
            series_name="1st Version",
            player_name="村上宗隆",
            team=Team.Swallows,
            card_number="101",
            rarity=Rarity.Parallel,
            is_rookie=False
        ),

        # --- 千葉ロッテマリーンズ (Marines) ---
        CardCatalog(
            manufacturer=Manufacturer.BBM,
            year=2020,
            series_name="Rookie Edition",
            player_name="佐々木朗希",
            team=Team.Marines,
            card_number="RE-01",
            rarity=Rarity.Rare,
            is_rookie=True # ルーキーカード
        ),

        # --- オリックス・バファローズ (Buffaloes) ---
        CardCatalog(
            manufacturer=Manufacturer.BBM,
            year=2024,
            series_name="Genesis",
            player_name="宮城大弥",
            team=Team.Buffaloes,
            card_number="G-11",
            rarity=Rarity.Patch, # ジャージカード
            is_rookie=False
        ),
        
        # --- 北海道日本ハムファイターズ (Fighters) ---
        CardCatalog(
            manufacturer=Manufacturer.Calbee,
            year=2024,
            series_name="Pro Baseball Chips",
            player_name="万波中正",
            team=Team.Fighters,
            card_number="C-55",
            rarity=Rarity.Common,
            is_rookie=False
        ),
    ]

    try:
        db.add_all(cards)
        db.commit()
        print(f"成功: {len(cards)} 件のシードデータを投入しました。")
    except Exception as e:
        print(f"データ投入エラー: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # テーブルがまだない場合は作成
    models.Base.metadata.create_all(bind=engine)
    seed_data()