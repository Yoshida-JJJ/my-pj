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

  async handleToolCall(toolName, params) {
    switch (toolName) {
      case 'get_shopify_orders':
        return await this.getShopifyOrders(params);
      case 'get_shopify_products':
        return await this.getShopifyProducts(params);
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