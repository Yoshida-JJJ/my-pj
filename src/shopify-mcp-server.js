#!/usr/bin/env node

const axios = require('axios');

class ShopifyMCPServer {
  constructor() {
    this.shopifyStore = process.env.SHOPIFY_STORE_URL;
    this.shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    this.version = "1.0.0";
  }

  formatShopifyDate(dateStr) {
    if (!dateStr) {
      return new Date().toISOString();
    }
    
    // 相対的な日付表現の処理
    if (dateStr.includes('daysAgo') || dateStr === 'today' || dateStr === 'yesterday') {
      const today = new Date();
      if (dateStr === 'today') return today.toISOString();
      if (dateStr === 'yesterday') {
        today.setDate(today.getDate() - 1);
        return today.toISOString();
      }
      const daysAgo = parseInt(dateStr.replace('daysAgo', ''));
      today.setDate(today.getDate() - daysAgo);
      return today.toISOString();
    }
    
    // ISO 8601形式（YYYY-MM-DD）やその他の標準形式の処理
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.error('Invalid date format:', dateStr);
        return new Date().toISOString();
      }
      return date.toISOString();
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
      return new Date().toISOString();
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
        `https://${this.shopifyStore}/admin/api/2024-01/orders.json`,
        {
          headers: {
            'X-Shopify-Access-Token': this.shopifyAccessToken,
            'Content-Type': 'application/json'
          },
          params: {
            status: 'any',
            limit: params.maxResults || 250, // より多くのデータを取得
            created_at_min: startDateFormatted,
            created_at_max: endDateFormatted
          }
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
        `https://${this.shopifyStore}/admin/api/2024-01/products.json`,
        {
          headers: {
            'X-Shopify-Access-Token': this.shopifyAccessToken,
            'Content-Type': 'application/json'
          },
          params: {
            limit: params.maxResults || 50
          }
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
      if (!this.shopifyStore || !this.shopifyAccessToken) {
        throw new Error('Shopify認証情報が設定されていません');
      }

      // 日付パラメータの準備
      const startDateFormatted = this.formatShopifyDate(params.startDate || '2025-01-01');
      const endDateFormatted = this.formatShopifyDate(params.endDate || 'today');
      const maxResults = params.maxResults || 20;
      
      console.log(`📊 Shopify売上ランキング取得期間: ${startDateFormatted} - ${endDateFormatted}`);
      
      // より多くの注文を取得（複数ページ対応）
      let allOrders = [];
      let page = 1;
      const limit = 250; // Shopify APIの最大値
      
      while (allOrders.length < 1000 && page <= 4) { // 最大1000件まで取得
        const response = await axios.get(
          `https://${this.shopifyStore}/admin/api/2024-01/orders.json`,
          {
            headers: {
              'X-Shopify-Access-Token': this.shopifyAccessToken,
              'Content-Type': 'application/json'
            },
            params: {
              status: 'any',
              limit: limit,
              created_at_min: startDateFormatted,
              created_at_max: endDateFormatted,
              page: page
            }
          }
        );
        
        const orders = response.data.orders || [];
        allOrders = allOrders.concat(orders);
        
        if (orders.length < limit) break; // 最後のページ
        page++;
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
      return {
        content: [{
          type: 'text',
          text: `❌ Shopify売上ランキング取得エラー: ${error.message}

🔧 **トラブルシューティング**:
1. Shopify API認証情報を確認してください
2. 指定期間にデータが存在するか確認してください
3. Shopify APIの利用制限に達していないか確認してください

エラー詳細: ${error.stack || error.message}`
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