#!/usr/bin/env node

const axios = require('axios');

class ShopifyMCPServer {
  constructor() {
    this.shopifyStore = process.env.SHOPIFY_STORE_URL;
    this.shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    this.version = "1.0.0";
    
    // デバッグ情報をログ出力
    console.log('🔧 Shopify MCP Server 初期化:');
    console.log('  SHOPIFY_STORE_URL:', this.shopifyStore ? '✓ 設定済み' : '✗ 未設定');
    console.log('  SHOPIFY_ACCESS_TOKEN:', this.shopifyAccessToken ? '✓ 設定済み' : '✗ 未設定');
    
    if (this.shopifyStore) {
      console.log('  Store URL:', this.shopifyStore);
    }
    if (this.shopifyAccessToken) {
      console.log('  Access Token (first 10 chars):', this.shopifyAccessToken.substring(0, 10) + '...');
    }
  }

  formatShopifyDate(dateStr) {
    console.log('📅 日付フォーマット処理:', dateStr);
    
    if (!dateStr) {
      const now = new Date().toISOString();
      console.log('  -> デフォルト (現在時刻):', now);
      return now;
    }
    
    // 相対的な日付表現の処理
    if (dateStr.includes('daysAgo') || dateStr === 'today' || dateStr === 'yesterday') {
      const today = new Date();
      if (dateStr === 'today') {
        const result = today.toISOString();
        console.log('  -> today:', result);
        return result;
      }
      if (dateStr === 'yesterday') {
        today.setDate(today.getDate() - 1);
        const result = today.toISOString();
        console.log('  -> yesterday:', result);
        return result;
      }
      const daysAgo = parseInt(dateStr.replace('daysAgo', ''));
      today.setDate(today.getDate() - daysAgo);
      const result = today.toISOString();
      console.log(`  -> ${daysAgo} days ago:`, result);
      return result;
    }
    
    // ISO 8601形式（YYYY-MM-DD）やその他の標準形式の処理
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.error('Invalid date format:', dateStr);
        const fallback = new Date().toISOString();
        console.log('  -> fallback:', fallback);
        return fallback;
      }
      const result = date.toISOString();
      console.log('  -> parsed:', result);
      return result;
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      const fallback = new Date().toISOString();
      console.log('  -> error fallback:', fallback);
      return fallback;
    }
  }

  async getShopifyOrders(params) {
    try {
      if (!this.shopifyStore || !this.shopifyAccessToken) {
        throw new Error('Shopify認証情報が設定されていません');
      }

      // 日付パラメータの準備
      const startDateFormatted = this.formatShopifyDate(params.startDate || '30daysAgo');
      const endDateFormatted = this.formatShopifyDate(params.endDate || 'today');
      
      console.log(`📅 Shopify注文データ取得期間: ${startDateFormatted} - ${endDateFormatted}`);
      
      const response = await axios.get(
        `https://${this.shopifyStore}/admin/api/2024-10/orders.json`,
        {
          headers: {
            'X-Shopify-Access-Token': this.shopifyAccessToken,
            'Content-Type': 'application/json'
          },
          params: {
            status: 'any',
            limit: params.maxResults || 250, // より多くのデータを取得
            created_at_min: startDateFormatted,
            created_at_max: endDateFormatted,
            order: 'created_at desc'
          },
          timeout: 30000
        }
      );

      const orders = response.data.orders || [];
      const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);
      const totalOrders = orders.length;
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      
      // 期間表示を動的に生成
      const startDate = new Date(startDateFormatted);
      const endDate = new Date(endDateFormatted);
      const periodDisplay = `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${endDate.getFullYear()}年${endDate.getMonth() + 1}月${endDate.getDate()}日`;

      return {
        content: [{
          type: 'text',
          text: `Shopify売上分析 (${periodDisplay}):\n\n💰 **売上サマリー**\n・総売上: ¥${totalSales.toLocaleString()}\n・注文数: ${totalOrders}件\n・平均注文額: ¥${Math.round(avgOrderValue).toLocaleString()}\n\n📦 **注文詳細**\n${
            orders.slice(0, Math.min(10, orders.length)).map((order, index) => {
              const lineItems = order.line_items.map(item => `${item.name} (¥${parseFloat(item.price).toLocaleString()})`).join(', ');
              return `${index + 1}. 注文#${order.order_number} - ¥${parseFloat(order.total_price).toLocaleString()}\n   商品: ${lineItems}\n   日時: ${new Date(order.created_at).toLocaleDateString()}`;
            }).join('\n\n') || '注文データがありません'
          }\n\n🛒 **商品別売上分析**\n${this.analyzeProductSales(orders)}\n\n**RAWデータ**\n${JSON.stringify({
            totalSales: totalSales,
            totalOrders: totalOrders,
            avgOrderValue: avgOrderValue,
            period: periodDisplay,
            topProducts: this.getTopProducts(orders)
          }, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Shopify注文データ取得エラー: ${error.message}`
        }]
      };
    }
  }

  async getShopifyProducts(params) {
    try {
      if (!this.shopifyStore || !this.shopifyAccessToken) {
        throw new Error('Shopify認証情報が設定されていません');
      }

      const response = await axios.get(
        `https://${this.shopifyStore}/admin/api/2024-10/products.json`,
        {
          headers: {
            'X-Shopify-Access-Token': this.shopifyAccessToken,
            'Content-Type': 'application/json'
          },
          params: {
            limit: params.maxResults || 50
          },
          timeout: 30000
        }
      );

      const products = response.data.products || [];

      return {
        content: [{
          type: 'text',
          text: `Shopify商品カタログ分析:\n\n📦 **商品一覧** (${products.length}件)\n${
            products.map((product, index) => {
              const variant = product.variants[0] || {};
              return `${index + 1}. ${product.title}\n   価格: ¥${variant.price ? parseFloat(variant.price).toLocaleString() : '不明'}\n   在庫: ${variant.inventory_quantity || '不明'}個\n   ステータス: ${product.status}\n   カテゴリー: ${product.product_type || '未分類'}`;
            }).join('\n\n') || '商品データがありません'
          }\n\n📊 **カテゴリー別集計**\n${this.analyzeProductCategories(products)}\n\n**RAWデータ**\n${JSON.stringify({
            productCount: products.length,
            products: products.map(p => ({
              id: p.id,
              title: p.title,
              price: p.variants[0]?.price,
              inventory: p.variants[0]?.inventory_quantity,
              type: p.product_type
            }))
          }, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Shopify商品データ取得エラー: ${error.message}`
        }]
      };
    }
  }

  analyzeProductSales(orders) {
    const productSales = {};
    
    orders.forEach(order => {
      order.line_items.forEach(item => {
        const productName = item.name;
        const price = parseFloat(item.price);
        const quantity = item.quantity;
        const totalPrice = price * quantity;
        
        if (!productSales[productName]) {
          productSales[productName] = { quantity: 0, totalSales: 0, avgPrice: 0 };
        }
        
        productSales[productName].quantity += quantity;
        productSales[productName].totalSales += totalPrice;
        productSales[productName].avgPrice = productSales[productName].totalSales / productSales[productName].quantity;
      });
    });

    return Object.entries(productSales)
      .sort((a, b) => b[1].totalSales - a[1].totalSales)
      .slice(0, 5)
      .map(([product, data], index) => 
        `${index + 1}. ${product}: ¥${Math.round(data.totalSales).toLocaleString()} (${data.quantity}個)`
      ).join('\n') || '商品売上データなし';
  }

  getTopProducts(orders) {
    const productSales = {};
    
    orders.forEach(order => {
      order.line_items.forEach(item => {
        const productName = item.name;
        const totalPrice = parseFloat(item.price) * item.quantity;
        
        if (!productSales[productName]) {
          productSales[productName] = 0;
        }
        productSales[productName] += totalPrice;
      });
    });

    return Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([product, sales]) => ({ product, sales }));
  }

  analyzeProductCategories(products) {
    const categories = {};
    
    products.forEach(product => {
      const category = product.product_type || '未分類';
      if (!categories[category]) {
        categories[category] = { count: 0, totalValue: 0 };
      }
      categories[category].count += 1;
      categories[category].totalValue += parseFloat(product.variants[0]?.price || 0);
    });

    return Object.entries(categories)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([category, data]) => 
        `• ${category}: ${data.count}商品 (平均価格: ¥${Math.round(data.totalValue / data.count).toLocaleString()})`
      ).join('\n') || 'カテゴリー情報なし';
  }

  async getShopifySalesRanking(params) {
    try {
      console.log('🛒 Shopify売上ランキング取得開始...');
      console.log('  Store URL:', this.shopifyStore);
      console.log('  Has Access Token:', !!this.shopifyAccessToken);
      
      if (!this.shopifyStore || !this.shopifyAccessToken) {
        console.log('⚠️ Shopify認証情報が未設定のため、デモデータを使用します');
        console.log('  SHOPIFY_STORE_URL:', this.shopifyStore || '未設定');
        console.log('  SHOPIFY_ACCESS_TOKEN:', this.shopifyAccessToken ? 'あり' : '未設定');
        return this.getDemoSalesRanking(params);
      }

      // 日付パラメータの準備
      const startDateFormatted = this.formatShopifyDate(params.startDate || '2025-01-01');
      const endDateFormatted = this.formatShopifyDate(params.endDate || 'today');
      const maxResults = params.maxResults || 20;
      
      console.log(`📊 Shopify売上ランキング取得期間: ${startDateFormatted} - ${endDateFormatted}`);
      
      // Shopify API接続テスト
      console.log('🔗 Shopify API接続テスト中...');
      
      // より多くの注文を取得（複数ページ対応）
      let allOrders = [];
      let page = 1;
      const limit = 250; // Shopify APIの最大値
      
      // 最初は少量でテスト
      const maxPages = 1; // テストのため1ページのみ
      const testLimit = 50; // テストのため50件のみ
      
      while (allOrders.length < 500 && page <= maxPages) { // テスト用に制限
        console.log(`📥 ページ${page}の注文データを取得中... (テストモード: ${testLimit}件まで)`);
        
        try {
          const response = await axios.get(
            `https://${this.shopifyStore}/admin/api/2024-10/orders.json`,
            {
              headers: {
                'X-Shopify-Access-Token': this.shopifyAccessToken,
                'Content-Type': 'application/json'
              },
              params: {
                status: 'any',
                limit: testLimit, // テスト用制限
                created_at_min: startDateFormatted,
                created_at_max: endDateFormatted,
                order: 'created_at desc'
              },
              timeout: 15000 // 15秒に短縮
            }
          );
          
          console.log(`✅ ページ${page}応答: ${response.status} ${response.statusText}`);
          console.log(`📦 取得した注文数: ${response.data.orders?.length || 0}`);
          
          const orders = response.data.orders || [];
          allOrders = allOrders.concat(orders);
          
          if (orders.length < limit) break; // 最後のページ
          page++;
          
        } catch (apiError) {
          console.error(`❌ Shopify API エラー (ページ${page}):`, apiError.message);
          console.error('  Response status:', apiError.response?.status);
          console.error('  Response data:', apiError.response?.data);
          
          if (apiError.response?.status === 401) {
            throw new Error('Shopify認証エラー: アクセストークンが無効です');
          } else if (apiError.response?.status === 404) {
            throw new Error('Shopifyストアが見つかりません: ストアURLを確認してください');
          } else if (apiError.response?.status === 429) {
            throw new Error('Shopify APIレート制限に達しました: しばらく待ってから再試行してください');
          } else {
            throw new Error(`Shopify API エラー: ${apiError.message}`);
          }
        }
      }
      
      console.log(`📊 総注文数: ${allOrders.length}件`);
      
      if (allOrders.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `📊 売上ランキング分析結果 (${periodDisplay})

⚠️ **注文データなし**
指定期間（${periodDisplay}）に注文データが見つかりませんでした。

🔍 **確認事項**:
1. 期間設定: より広い期間で再試行してください
2. Shopify設定: 注文データが正しく記録されているか確認
3. API権限: 注文データへのアクセス権限があるか確認

💡 **推奨アクション**:
- 「過去6ヶ月の売上ランキング」など期間を拡張して再試行
- Shopify管理画面で注文履歴を確認
- API権限設定を確認`
          }]
        };
      }

      // 商品別売上集計
      const productSales = {};
      let totalRevenue = 0;
      let totalOrders = allOrders.length;
      
      allOrders.forEach(order => {
        const orderTotal = parseFloat(order.total_price || 0);
        totalRevenue += orderTotal;
        
        order.line_items.forEach(item => {
          const productName = item.name;
          const productId = item.product_id;
          const price = parseFloat(item.price);
          const quantity = item.quantity;
          const revenue = price * quantity;
          
          if (!productSales[productName]) {
            productSales[productName] = {
              id: productId,
              name: productName,
              quantity: 0,
              revenue: 0,
              orders: new Set(),
              avgPrice: 0
            };
          }
          
          productSales[productName].quantity += quantity;
          productSales[productName].revenue += revenue;
          productSales[productName].orders.add(order.id);
          productSales[productName].avgPrice = productSales[productName].revenue / productSales[productName].quantity;
        });
      });

      // 売上順にソート
      const sortedProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, maxResults);

      // 期間表示を動的に生成
      const startDate = new Date(startDateFormatted);
      const endDate = new Date(endDateFormatted);
      const periodDisplay = `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${endDate.getFullYear()}年${endDate.getMonth() + 1}月${endDate.getDate()}日`;

      // 売上ランキングのフォーマット
      const rankingText = sortedProducts.map((product, index) => {
        const share = ((product.revenue / totalRevenue) * 100).toFixed(1);
        const orderCount = product.orders.size;
        
        return `${index + 1}位. ${product.name}
   💰 売上: ¥${Math.round(product.revenue).toLocaleString()} (シェア: ${share}%)
   📦 販売数: ${product.quantity.toLocaleString()}個
   💱 平均単価: ¥${Math.round(product.avgPrice).toLocaleString()}
   📋 注文回数: ${orderCount}回`;
      }).join('\n\n');

      // ABC分析
      let cumulativeShare = 0;
      const abcAnalysis = { A: [], B: [], C: [] };
      
      sortedProducts.forEach(product => {
        const share = (product.revenue / totalRevenue) * 100;
        cumulativeShare += share;
        
        if (cumulativeShare <= 80) {
          abcAnalysis.A.push(product);
        } else if (cumulativeShare <= 95) {
          abcAnalysis.B.push(product);
        } else {
          abcAnalysis.C.push(product);
        }
      });

      // 仕入れ戦略の提案
      const strategy = this.generatePurchaseStrategy(abcAnalysis, sortedProducts, totalRevenue, totalOrders);

      return {
        content: [{
          type: 'text',
          text: `🏆 商品別売上ランキング & 仕入れ戦略 (${periodDisplay})

📊 **売上サマリー**
・総売上: ¥${totalRevenue.toLocaleString()}
・総注文数: ${totalOrders.toLocaleString()}件
・平均注文額: ¥${Math.round(totalRevenue / totalOrders).toLocaleString()}
・分析商品数: ${sortedProducts.length}商品

🏆 **売上ランキング TOP${maxResults}**

${rankingText}

📈 **ABC分析**
・Aランク商品 (上位80%売上): ${abcAnalysis.A.length}商品
・Bランク商品 (80-95%売上): ${abcAnalysis.B.length}商品  
・Cランク商品 (残り5%売上): ${abcAnalysis.C.length}商品

${strategy}

📊 **データ詳細**
${JSON.stringify({
  period: periodDisplay,
  totalRevenue: totalRevenue,
  totalOrders: totalOrders,
  analyzedProducts: sortedProducts.length,
  abcAnalysis: {
    A: abcAnalysis.A.length,
    B: abcAnalysis.B.length,
    C: abcAnalysis.C.length
  },
  topProducts: sortedProducts.slice(0, 5).map(p => ({
    name: p.name,
    revenue: p.revenue,
    quantity: p.quantity,
    avgPrice: p.avgPrice
  }))
}, null, 2)}`
        }]
      };
    } catch (error) {
      console.error('❌ Shopify API エラー - デモデータにフォールバック:', error.message);
      
      // APIエラー時はデモデータを表示
      const demoResult = this.getDemoSalesRanking(params);
      
      return {
        content: [{
          type: 'text',
          text: `⚠️ **Shopify API接続エラー - デモデータを表示しています**

🔧 **発生したエラー**: ${error.message}

📊 **対処法**: 
- Shopify API認証情報を確認
- ネットワーク接続を確認
- Shopify APIレート制限の確認

**以下はデモデータによる売上ランキングです：**

${demoResult.content[0].text}`
        }]
      };
    }
  }

  generatePurchaseStrategy(abcAnalysis, sortedProducts, totalRevenue, totalOrders) {
    let strategy = `\n🎯 **仕入れ戦略提案**\n\n`;
    
    // Aランク商品戦略
    if (abcAnalysis.A.length > 0) {
      const topProduct = abcAnalysis.A[0];
      strategy += `💎 **Aランク商品戦略 (${abcAnalysis.A.length}商品)**
・売上の80%を占める重要商品群
・在庫切れ防止が最優先
・推奨: 安全在庫を1.5-2倍に増量
・トップ商品「${topProduct.name}」は月間¥${Math.round(topProduct.revenue).toLocaleString()}の売上\n\n`;
    }
    
    // Bランク商品戦略
    if (abcAnalysis.B.length > 0) {
      strategy += `⚖️ **Bランク商品戦略 (${abcAnalysis.B.length}商品)**
・売上の15%を占める中核商品群
・需要予測に基づく適正在庫管理
・推奨: 月次売上の1-1.2倍の在庫確保\n\n`;
    }
    
    // Cランク商品戦略
    if (abcAnalysis.C.length > 0) {
      strategy += `📉 **Cランク商品戦略 (${abcAnalysis.C.length}商品)**
・売上の5%程度の少量商品群
・在庫圧縮と効率化が重要
・推奨: 在庫を最小限に抑制、一部商品の廃番検討\n\n`;
    }
    
    // 成長性分析
    const highValueProducts = sortedProducts.filter(p => p.avgPrice > 5000);
    const highVolumeProducts = sortedProducts.filter(p => p.quantity > 50);
    
    strategy += `📈 **成長機会の特定**\n`;
    if (highValueProducts.length > 0) {
      strategy += `・高単価商品 (¥5,000以上): ${highValueProducts.length}商品 → 利益率改善の機会\n`;
    }
    if (highVolumeProducts.length > 0) {
      strategy += `・高回転商品 (50個以上販売): ${highVolumeProducts.length}商品 → 量的拡大の機会\n`;
    }
    
    strategy += `\n💡 **推奨アクション**
1. 上位3商品の在庫を即座に2週間分確保
2. 月次で売上推移をモニタリング
3. 季節性を考慮した発注計画の策定
4. 新商品導入は既存Aランク商品との関連性を重視`;
    
    return strategy;
  }

  getDemoSalesRanking(params) {
    // デモ用売上データ（2025年1月～現在）
    const demoProducts = [
      {
        name: "BigLuckGear プレミアムキャンプチェア",
        category: "アウトドア",
        quantity: 145,
        revenue: 2175000, // ¥15,000 x 145個
        orders: new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100]),
        avgPrice: 15000
      },
      {
        name: "BigLuckGear テント 4人用",
        category: "アウトドア", 
        quantity: 89,
        revenue: 1780000, // ¥20,000 x 89個
        orders: new Set([101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189]),
        avgPrice: 20000
      },
      {
        name: "BigLuckGear アウトドアクッカーセット",
        category: "キッチン用品",
        quantity: 234,
        revenue: 1404000, // ¥6,000 x 234個
        orders: new Set(Array.from({length: 156}, (_, i) => i + 200)),
        avgPrice: 6000
      },
      {
        name: "BigLuckGear LED ランタン",
        category: "照明",
        quantity: 178,
        revenue: 1068000, // ¥6,000 x 178個
        orders: new Set(Array.from({length: 112}, (_, i) => i + 400)),
        avgPrice: 6000
      },
      {
        name: "BigLuckGear 寝袋 -5℃対応",
        category: "アウトドア",
        quantity: 95,
        revenue: 950000, // ¥10,000 x 95個
        orders: new Set(Array.from({length: 67}, (_, i) => i + 600)),
        avgPrice: 10000
      },
      {
        name: "BigLuckGear フィッシングロッド",
        category: "釣り具",
        quantity: 56,
        revenue: 840000, // ¥15,000 x 56個
        orders: new Set(Array.from({length: 45}, (_, i) => i + 700)),
        avgPrice: 15000
      },
      {
        name: "BigLuckGear バックパック 50L",
        category: "バッグ",
        quantity: 123,
        revenue: 738000, // ¥6,000 x 123個  
        orders: new Set(Array.from({length: 89}, (_, i) => i + 800)),
        avgPrice: 6000
      },
      {
        name: "BigLuckGear 折りたたみテーブル",
        category: "アウトドア",
        quantity: 67,
        revenue: 603000, // ¥9,000 x 67個
        orders: new Set(Array.from({length: 56}, (_, i) => i + 900)),
        avgPrice: 9000
      },
      {
        name: "BigLuckGear ポータブル焚き火台",
        category: "アウトドア",
        quantity: 45,
        revenue: 540000, // ¥12,000 x 45個
        orders: new Set(Array.from({length: 38}, (_, i) => i + 1000)),
        avgPrice: 12000
      },
      {
        name: "BigLuckGear アウトドアナイフ",
        category: "ツール",
        quantity: 189,
        revenue: 472500, // ¥2,500 x 189個
        orders: new Set(Array.from({length: 134}, (_, i) => i + 1100)),
        avgPrice: 2500
      }
    ];

    const totalRevenue = demoProducts.reduce((sum, product) => sum + product.revenue, 0);
    const totalOrders = 312; // 想定注文数
    const startDate = new Date(params.startDate || '2025-01-01');
    const endDate = new Date(params.endDate || new Date());
    const periodDisplay = `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${endDate.getFullYear()}年${endDate.getMonth() + 1}月${endDate.getDate()}日`;

    // 売上順にソート（既にソート済み）
    const maxResults = params.maxResults || 20;
    const sortedProducts = demoProducts.slice(0, maxResults);

    // 売上ランキングのフォーマット
    const rankingText = sortedProducts.map((product, index) => {
      const share = ((product.revenue / totalRevenue) * 100).toFixed(1);
      const orderCount = product.orders.size;
      
      return `${index + 1}位. ${product.name}
   💰 売上: ¥${product.revenue.toLocaleString()} (シェア: ${share}%)
   📦 販売数: ${product.quantity.toLocaleString()}個
   💱 平均単価: ¥${product.avgPrice.toLocaleString()}
   📋 注文回数: ${orderCount}回`;
    }).join('\n\n');

    // ABC分析
    let cumulativeShare = 0;
    const abcAnalysis = { A: [], B: [], C: [] };
    
    sortedProducts.forEach(product => {
      const share = (product.revenue / totalRevenue) * 100;
      cumulativeShare += share;
      
      if (cumulativeShare <= 80) {
        abcAnalysis.A.push(product);
      } else if (cumulativeShare <= 95) {
        abcAnalysis.B.push(product);
      } else {
        abcAnalysis.C.push(product);
      }
    });

    // 仕入れ戦略の提案
    const strategy = this.generatePurchaseStrategy(abcAnalysis, sortedProducts, totalRevenue, totalOrders);

    return {
      content: [{
        type: 'text',
        text: `🏆 商品別売上ランキング & 仕入れ戦略 (${periodDisplay})
⚠️ **デモデータ使用中** - 実際のShopifyデータに接続するには管理者にお問い合わせください

📊 **売上サマリー**
・総売上: ¥${totalRevenue.toLocaleString()}
・総注文数: ${totalOrders.toLocaleString()}件
・平均注文額: ¥${Math.round(totalRevenue / totalOrders).toLocaleString()}
・分析商品数: ${sortedProducts.length}商品

🏆 **売上ランキング TOP${maxResults}**

${rankingText}

📈 **ABC分析**
・Aランク商品 (上位80%売上): ${abcAnalysis.A.length}商品
・Bランク商品 (80-95%売上): ${abcAnalysis.B.length}商品  
・Cランク商品 (残り5%売上): ${abcAnalysis.C.length}商品

${strategy}

🔧 **実データ接続について**
現在はデモデータを使用しています。実際のShopify売上データに接続するには：
1. Shopify Private Appの作成
2. API認証情報の設定
3. 環境変数の追加
が必要です。

📊 **データ詳細**
${JSON.stringify({
  demoMode: true,
  period: periodDisplay,
  totalRevenue: totalRevenue,
  totalOrders: totalOrders,
  analyzedProducts: sortedProducts.length,
  abcAnalysis: {
    A: abcAnalysis.A.length,
    B: abcAnalysis.B.length,
    C: abcAnalysis.C.length
  },
  topProducts: sortedProducts.slice(0, 5).map(p => ({
    name: p.name,
    revenue: p.revenue,
    quantity: p.quantity,
    avgPrice: p.avgPrice
  }))
}, null, 2)}`
      }]
    };
  }

  async handleToolCall(toolName, params) {
    switch (toolName) {
      case 'get_shopify_orders':
        return await this.getShopifyOrders(params);
      case 'get_shopify_products':
        return await this.getShopifyProducts(params);
      case 'get_shopify_sales_ranking':
        return await this.getShopifySalesRanking(params);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  getAvailableTools() {
    return [
      {
        name: "get_shopify_orders",
        description: "Shopifyの注文データを取得し、売上分析を行います",
        inputSchema: {
          type: "object",
          properties: {
            startDate: { type: "string", description: "開始日 (YYYY-MM-DD or 30daysAgo)" },
            endDate: { type: "string", description: "終了日 (YYYY-MM-DD or today)" },
            maxResults: { type: "number", description: "最大取得件数", default: 50 }
          },
          required: ["startDate", "endDate"]
        }
      },
      {
        name: "get_shopify_products",
        description: "Shopifyの商品カタログデータを取得し、商品分析を行います",
        inputSchema: {
          type: "object",
          properties: {
            maxResults: { type: "number", description: "最大取得件数", default: 50 }
          }
        }
      },
      {
        name: "get_shopify_sales_ranking",
        description: "Shopifyの商品別売上ランキングを取得し、仕入れ戦略を提案します",
        inputSchema: {
          type: "object",
          properties: {
            startDate: { type: "string", description: "開始日 (YYYY-MM-DD or 2025-01-01)" },
            endDate: { type: "string", description: "終了日 (YYYY-MM-DD or today)" },
            maxResults: { type: "number", description: "ランキング件数", default: 20 }
          },
          required: ["startDate", "endDate"]
        }
      }
    ];
  }

  async run() {
    process.stdin.setEncoding('utf8');
    
    let buffer = '';
    
    process.stdin.on('data', async (chunk) => {
      buffer += chunk;
      
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        
        if (line.trim()) {
          try {
            const request = JSON.parse(line);
            const response = await this.handleRequest(request);
            console.log(JSON.stringify(response));
          } catch (error) {
            console.log(JSON.stringify({
              error: { message: error.message }
            }));
          }
        }
      }
    });

    // 初期化完了をシグナル
    console.log(JSON.stringify({
      type: "initialization",
      serverInfo: {
        name: "shopify-mcp-server",
        version: this.version
      },
      capabilities: {
        tools: {}
      }
    }));
  }

  async handleRequest(request) {
    switch (request.method) {
      case 'tools/list':
        return {
          tools: this.getAvailableTools()
        };
      
      case 'tools/call':
        const result = await this.handleToolCall(request.params.name, request.params.arguments);
        return result;
      
      default:
        throw new Error(`Unknown method: ${request.method}`);
    }
  }
}

// サーバー起動
if (require.main === module) {
  const server = new ShopifyMCPServer();
  server.run();
}

module.exports = ShopifyMCPServer;