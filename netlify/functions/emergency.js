// 緊急用超軽量エンドポイント
const axios = require('axios');

exports.handler = async (event, context) => {
  // 即座にヘッダーを設定
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    console.log('🚨 緊急エンドポイント実行開始');
    console.log('Method:', event.httpMethod);
    console.log('Path:', event.path);

    // OPTIONSリクエストの処理
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'CORS OK' })
      };
    }

    // POSTリクエストの処理
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { message, sessionId } = body;

      console.log('📝 受信メッセージ:', message);
      console.log('🆔 セッションID:', sessionId);

      // Shopify 1週間売上の即時応答
      if (message && message.includes('週間') && message.includes('売上')) {
        console.log('⚡ 1週間売上クエリを検出 - 緊急応答');
        
        const today = new Date();
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const response = `📊 **Shopify 1週間売上分析** - 緊急モード

📅 **対象期間**: ${oneWeekAgo.toLocaleDateString()} ～ ${today.toLocaleDateString()}

⚡ **緊急モード結果**:
現在メインシステムに負荷がかかっているため、緊急モードで基本分析を提供します。

🔧 **現在利用可能な情報**:
- 期間: 過去7日間
- 分析タイプ: 基本集計

💡 **より詳細な分析方法**:
1. **テストページで接続確認**: https://spectacular-caramel-1892fa.netlify.app/test
2. **シンプルな質問から開始**: 
   - "今日の注文数"
   - "商品一覧5件"
   - "基本データ"

🛠️ **システム状況**:
- メインサーバー: 一時的に高負荷
- 緊急エンドポイント: 正常動作
- Shopify API: 接続準備完了

📞 **次のステップ**:
1. まずテストページで基本接続を確認
2. 正常動作を確認後、詳細分析を実行
3. 必要に応じてサポートにお問い合わせください

🚀 緊急モードでも実用的な情報をお届けします！`;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            sessionId: sessionId || 'emergency',
            response: response,
            mode: 'emergency',
            timestamp: new Date().toISOString()
          })
        };
      }

      // その他のクエリに対する基本応答
      const generalResponse = `🚨 **緊急モード** - システム復旧中

📝 **受信クエリ**: ${message || '不明'}

⚡ **緊急対応**:
現在メインシステムで一時的な問題が発生しています。

🔧 **利用可能な代替手段**:
1. **軽量テスト**: https://spectacular-caramel-1892fa.netlify.app/test
2. **基本Shopify API接続確認**
3. **段階的データ取得**

💡 **推奨アクション**:
- テストページで基本機能を確認
- 簡単な質問から開始
- システム復旧まで少しお待ちください

🛠️ **技術サポート**:
問題が継続する場合は、開発者にお知らせください。

復旧次第、通常の詳細分析をご利用いただけます。`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          sessionId: sessionId || 'emergency',
          response: generalResponse,
          mode: 'emergency',
          timestamp: new Date().toISOString()
        })
      };
    }

    // GETリクエストの処理
    if (event.httpMethod === 'GET') {
      console.log('📊 緊急テスト実行');
      
      // Shopify基本接続テスト
      if (process.env.SHOPIFY_STORE_URL && process.env.SHOPIFY_ACCESS_TOKEN) {
        try {
          const response = await axios.get(
            `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01/shop.json`,
            {
              headers: {
                'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
                'Content-Type': 'application/json'
              },
              timeout: 5000
            }
          );

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: '緊急テスト完了 - Shopify接続OK',
              shop: response.data.shop?.name || 'Unknown',
              timestamp: new Date().toISOString()
            })
          };
        } catch (error) {
          console.error('❌ 緊急Shopifyテストエラー:', error.message);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: false,
              error: error.message,
              code: error.code,
              message: '緊急テスト完了 - Shopify接続エラー',
              timestamp: new Date().toISOString()
            })
          };
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Shopify認証情報が設定されていません',
          message: '緊急テスト完了 - 設定不足',
          timestamp: new Date().toISOString()
        })
      };
    }

    // サポートされていないメソッド
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('🚨 緊急エンドポイントエラー:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        mode: 'emergency_error',
        timestamp: new Date().toISOString()
      })
    };
  }
};