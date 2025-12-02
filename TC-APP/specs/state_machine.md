# Listing Lifecycle State Machine

このドキュメントは、出品アイテム(`ListingItem`)の状態遷移ルールを定義します。
バックエンド実装時は、この遷移図以外のステータス変更を許可しないでください。

```mermaid
stateDiagram-v2
    [*] --> Draft: 新規作成(下書き)
    
    Draft --> Active: 出品公開(Publish)
    note right of Active: 検索結果に表示される状態
    
    Active --> Cancelled: 出品取り下げ
    Active --> TransactionPending: 購入リクエスト(Buy)
    
    state TransactionPending {
        [*] --> PaymentVerifying
        PaymentVerifying --> PaymentCaptured: 決済成功
        PaymentVerifying --> PaymentFailed: 決済失敗
    }
    
    TransactionPending --> Active: 決済失敗/タイムアウト(在庫戻し)
    TransactionPending --> Sold: 決済確定(在庫引き落とし完了)
    
    state Sold {
        [*] --> AwaitingShipment: 発送待ち
        AwaitingShipment --> Shipped: 発送通知(追跡番号登録)
        Shipped --> Delivered: 配達完了(配送業者API連携)
        Delivered --> Completed: 受取評価完了(取引終了)
    }
    
    Sold --> Dispute: トラブル報告(運営介入)
    Dispute --> Cancelled: 返金・キャンセル
    Dispute --> Completed: 調停・取引成立