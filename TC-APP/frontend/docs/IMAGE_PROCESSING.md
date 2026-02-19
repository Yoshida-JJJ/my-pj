# カード画像自動最適化機能

## 概要

トレーディングカード画像をアップロード時に自動で統一フォーマット（800x1120px WebP, 品質85%）に変換する機能です。

### 主な特徴

- **自動リサイズ**: アスペクト比を維持しながら800x1120px（5:7比率）にリサイズ
- **フォーマット変換**: JPEG/PNG/WebP → 最適化WebP
- **メタデータ除去**: EXIF情報を自動削除（プライバシー保護）
- **透過処理**: PNG透過画像は白背景に合成
- **回転補正**: EXIF回転情報に基づく自動補正

---

## API仕様

### エンドポイント

```
POST /api/upload-card-image
```

### リクエスト

- **Content-Type**: `multipart/form-data`
- **認証**: Supabase Auth（Cookie認証）

| フィールド | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `front` | File | いいえ* | カード表面画像 |
| `back` | File | いいえ* | カード裏面画像 |

\* 少なくとも1つの画像が必要です。

#### 制限事項

- 対応形式: JPEG, PNG, WebP
- 最大ファイルサイズ: 10MB/ファイル
- 出力サイズ: 800x1120px
- 出力形式: WebP（品質85%）

### レスポンス

#### 成功時 (200)

```json
{
  "success": true,
  "images": {
    "front": {
      "url": "https://xxx.supabase.co/storage/v1/object/public/card-images/userId/timestamp_front.webp",
      "originalSize": 1024000,
      "processedSize": 300000,
      "dimensions": "800x1120"
    },
    "back": {
      "url": "https://xxx.supabase.co/storage/v1/object/public/card-images/userId/timestamp_back.webp",
      "originalSize": 800000,
      "processedSize": 250000,
      "dimensions": "800x1120"
    }
  }
}
```

#### エラー時

```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

| ステータス | エラーメッセージ |
|-----------|-----------------|
| 401 | 認証が必要です。ログインしてください。 |
| 400 | ファイル形式が無効です。JPEG、PNG、WebPのみ対応しています。 |
| 400 | ファイルサイズが大きすぎます。最大10MBまでです。 |
| 400 | 画像処理に失敗しました。 |
| 500 | アップロードに失敗しました。もう一度お試しください。 |

---

## 使用例

### コンポーネントでの使用

```tsx
import CardImageUploader from '@/components/CardImageUploader';

function MyPage() {
  return (
    <CardImageUploader
      onUploadComplete={(images) => {
        if (images.front) {
          console.log('表面URL:', images.front.url);
        }
        if (images.back) {
          console.log('裏面URL:', images.back.url);
        }
      }}
    />
  );
}
```

### APIの直接呼び出し

```typescript
const formData = new FormData();
formData.append('front', frontFile);
formData.append('back', backFile);

const response = await fetch('/api/upload-card-image', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
```

---

## トラブルシューティング

### 「ファイル形式が無効です」エラー

対応形式はJPEG、PNG、WebPのみです。GIF、BMP、TIFF等は非対応です。ファイルの拡張子が正しいか確認してください。

### 「ファイルサイズが大きすぎます」エラー

1ファイルあたり最大10MBです。画像編集ソフトで事前にリサイズするか、品質を下げて保存してください。

### 「画像処理に失敗しました」エラー

画像ファイルが破損している可能性があります。別のファイルで試すか、画像を再保存してからアップロードしてください。

### 「アップロードに失敗しました」エラー

ネットワーク接続を確認し、再度お試しください。問題が続く場合はSupabase Storageの設定を確認してください。

---

## 技術詳細

### 画像処理フロー

1. ファイル形式・サイズのバリデーション
2. EXIF回転情報に基づく自動補正（`sharp.rotate()`）
3. 透過チャンネルの除去（白背景にフラット化）
4. アスペクト比を維持したリサイズ
5. 白背景パディングで800x1120pxに統一
6. WebP形式（品質85%）で出力
7. Supabase Storageへアップロード

### ストレージパス

```
card-images/{userId}/{timestamp}_front.webp
card-images/{userId}/{timestamp}_back.webp
```

### 依存ライブラリ

- [Sharp](https://sharp.pixelplumbing.com/) - 高性能Node.js画像処理ライブラリ
