#!/usr/bin/env node

const axios = require('axios');

/**
 * 真のMCPサーバー: Shopify API ツール群
 * 自然言語でShopify APIを柔軟に呼び出せるツールセット
 */
class TrueShopifyMCPServer {
  constructor() {
    this.shopifyStore = process.env.SHOPIFY_STORE_URL;
    this.shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    this.version = "2.0.0";
    
    console.log('🚀 True Shopify MCP Server v2.0.0 初期化');
    console.log('📊 利用可能ツール: orders, products, customers, inventory, analytics');
    
    if (!this.shopifyStore || !this.shopifyAccessToken) {
      console.warn('⚠️ Shopify認証情報が未設定です');
    }
  }

  // 基本的なShopify API呼び出し
  async makeShopifyRequest(endpoint, params = {}) {
    const url = `https://${this.shopifyStore}/admin/api/2024-01${endpoint}`;
    const queryParams = new URLSearchParams(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    );
    
    const response = await axios.get(`${url}?${queryParams}`, {
      headers: {
        'X-Shopify-Access-Token': this.shopifyAccessToken,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return response.data;
  }

  // ツール1: 基本的な注文取得
  async getOrders(params) {
    try {
      const {
        startDate,
        endDate,
        status = 'any',
        financialStatus = 'paid',
        limit = 50,
        fields
      } = params;

      const apiParams = {
        status,
        financial_status: financialStatus,
        limit: Math.min(limit, 250)
      };

      if (startDate) apiParams.created_at_min = new Date(startDate).toISOString();
      if (endDate) apiParams.created_at_max = new Date(endDate).toISOString();
      if (fields) apiParams.fields = fields;

      const data = await this.makeShopifyRequest('/orders.json', apiParams);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tool: 'get_orders',
            orderCount: data.orders?.length || 0,
            orders: data.orders || [],
            period: startDate && endDate ? `${startDate} to ${endDate}` : 'all time'
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('get_orders', error);
    }
  }

  // ツール2: 商品情報取得
  async getProducts(params) {
    try {
      const {
        limit = 50,
        vendor,
        productType,
        status = 'active',
        fields,
        title
      } = params;

      const apiParams = {
        limit: Math.min(limit, 250),
        status
      };

      if (vendor) apiParams.vendor = vendor;
      if (productType) apiParams.product_type = productType;
      if (fields) apiParams.fields = fields;
      if (title) apiParams.title = title;

      const data = await this.makeShopifyRequest('/products.json', apiParams);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tool: 'get_products',
            productCount: data.products?.length || 0,
            products: data.products || []
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('get_products', error);
    }
  }

  // ツール3: 顧客情報取得
  async getCustomers(params) {
    try {
      const {
        limit = 50,
        createdAfter,
        sinceId,
        fields
      } = params;

      const apiParams = {
        limit: Math.min(limit, 250)
      };

      if (createdAfter) apiParams.created_at_min = new Date(createdAfter).toISOString();
      if (sinceId) apiParams.since_id = sinceId;
      if (fields) apiParams.fields = fields;

      const data = await this.makeShopifyRequest('/customers.json', apiParams);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tool: 'get_customers',
            customerCount: data.customers?.length || 0,
            customers: data.customers || []
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('get_customers', error);
    }
  }

  // ツール4: 在庫分析（最適化版）
  async analyzeInventory(params) {
    try {
      const { lowStockThreshold = 10, outOfStockOnly = false, limit = 50 } = params;

      console.log(`🔍 在庫分析開始: 閾値=${lowStockThreshold}, 在庫切れのみ=${outOfStockOnly}`);
      console.log(`🔧 Shopify設定確認: Store=${this.shopifyStore || '未設定'}, Token=${this.shopifyAccessToken ? '設定済み' : '未設定'}`);
      
      // Shopify認証情報のチェック
      if (!this.shopifyStore || !this.shopifyAccessToken) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              tool: 'analyze_inventory',
              error: 'Shopify認証情報が設定されていません',
              message: '在庫分析にはShopifyストアとアクセストークンが必要です',
              suggestion: '環境変数SHOPIFY_STORE_URLとSHOPIFY_ACCESS_TOKENを設定してください'
            }, null, 2)
          }]
        };
      }
      
      const data = await this.makeShopifyRequest('/products.json', {
        limit: Math.min(limit, 50), // エラー回避のために制限
        fields: 'id,title,variants,product_type,vendor'
      });
      
      console.log(`📦 商品データ取得完了: ${data.products?.length || 0}件`);

      const inventoryAnalysis = [];
      let totalChecked = 0;
      
      data.products?.forEach(product => {
        if (!product.variants || product.variants.length === 0) return;
        
        product.variants.forEach(variant => {
          totalChecked++;
          const inventory = parseInt(variant.inventory_quantity || 0);
          const shouldInclude = outOfStockOnly ? 
            inventory === 0 : 
            inventory <= lowStockThreshold;

          if (shouldInclude) {
            inventoryAnalysis.push({
              productId: product.id,
              productTitle: product.title,
              productType: product.product_type,
              vendor: product.vendor,
              variantId: variant.id,
              variantTitle: variant.title || product.title,
              inventoryQuantity: inventory,
              price: parseFloat(variant.price || 0),
              sku: variant.sku || 'N/A'
            });
          }
        });
      });
      
      console.log(`✅ 在庫分析完了: ${totalChecked}バリエーション中${inventoryAnalysis.length}件が条件に該当`);

      // 結果を分かりやすい形式で整理
      const summary = {
        tool: 'analyze_inventory',
        analysis: {
          threshold: lowStockThreshold,
          outOfStockOnly,
          totalProductsChecked: data.products?.length || 0,
          totalVariantsChecked: totalChecked,
          lowStockItemsFound: inventoryAnalysis.length
        },
        lowStockItems: inventoryAnalysis.sort((a, b) => a.inventoryQuantity - b.inventoryQuantity)
      };
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(summary, null, 2)
        }]
      };
    } catch (error) {
      console.error('❌ 在庫分析エラー:', error.message);
      
      // エラータイプ別の詳細メッセージ
      let errorMessage = '在庫分析中にエラーが発生しました';
      let suggestion = 'しばらく待ってから再度お試しください';
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = 'ネットワーク接続エラー';
        suggestion = 'インターネット接続を確認してください';
      } else if (error.response?.status === 401) {
        errorMessage = 'Shopify認証エラー';
        suggestion = 'アクセストークンを確認してください';
      } else if (error.response?.status === 429) {
        errorMessage = 'APIレート制限';
        suggestion = '1分待ってから再度お試しください';
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tool: 'analyze_inventory',
            error: errorMessage,
            details: error.message,
            suggestion: suggestion,
            fallback: '現在、在庫分析機能は一時的に利用できません。Shopify管理画面で直接在庫を確認してください。',
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    }
  }

  // ツール5: 売上分析
  async analyzeSales(params) {
    try {
      const {
        startDate,
        endDate,
        groupBy = 'product', // product, category, vendor, day, month
        limit = 20
      } = params;

      const apiParams = {
        status: 'any',
        financial_status: 'paid',
        limit: 250
      };

      if (startDate) apiParams.created_at_min = new Date(startDate).toISOString();
      if (endDate) apiParams.created_at_max = new Date(endDate).toISOString();

      const data = await this.makeShopifyRequest('/orders.json', apiParams);
      
      let analysis = {};
      
      switch (groupBy) {
        case 'product':
          analysis = this.groupByProduct(data.orders || []);
          break;
        case 'category':
          analysis = await this.groupByCategory(data.orders || []);
          break;
        case 'vendor':
          analysis = await this.groupByVendor(data.orders || []);
          break;
        case 'day':
          analysis = this.groupByDay(data.orders || []);
          break;
        case 'month':
          analysis = this.groupByMonth(data.orders || []);
          break;
        default:
          analysis = this.groupByProduct(data.orders || []);
      }

      const sortedResults = Object.entries(analysis)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, limit)
        .map(([key, value]) => ({ [groupBy]: key, ...value }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tool: 'analyze_sales',
            period: startDate && endDate ? `${startDate} to ${endDate}` : 'all time',
            groupBy,
            totalOrders: data.orders?.length || 0,
            results: sortedResults
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('analyze_sales', error);
    }
  }

  // ツール6: 顧客セグメント分析
  async analyzeCustomerSegments(params) {
    try {
      const { minOrderCount = 2, highValueThreshold = 50000 } = params;

      const data = await this.makeShopifyRequest('/customers.json', {
        limit: 250,
        fields: 'id,email,orders_count,total_spent,created_at,last_order_id'
      });

      const segments = {
        new: [], // 1回購入
        returning: [], // 複数回購入、低額
        vip: [], // 高額顧客
        inactive: [] // 長期未購入
      };

      data.customers?.forEach(customer => {
        const orderCount = customer.orders_count || 0;
        const totalSpent = parseFloat(customer.total_spent || 0);
        const createdAt = new Date(customer.created_at);
        const daysSinceCreated = (new Date() - createdAt) / (1000 * 60 * 60 * 24);

        if (orderCount === 1) {
          segments.new.push(customer);
        } else if (orderCount >= minOrderCount && totalSpent < highValueThreshold) {
          segments.returning.push(customer);
        } else if (totalSpent >= highValueThreshold) {
          segments.vip.push(customer);
        } else if (daysSinceCreated > 90 && orderCount === 0) {
          segments.inactive.push(customer);
        }
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tool: 'analyze_customer_segments',
            totalCustomers: data.customers?.length || 0,
            segments: {
              new: { count: segments.new.length, customers: segments.new },
              returning: { count: segments.returning.length, customers: segments.returning },
              vip: { count: segments.vip.length, customers: segments.vip },
              inactive: { count: segments.inactive.length, customers: segments.inactive }
            },
            criteria: { minOrderCount, highValueThreshold }
          }, null, 2)
        }]
      };
    } catch (error) {
      return this.handleError('analyze_customer_segments', error);
    }
  }

  // ヘルパーメソッド: 商品別グループ化
  groupByProduct(orders) {
    const productSales = {};
    
    orders.forEach(order => {
      order.line_items?.forEach(item => {
        const key = item.name;
        if (!productSales[key]) {
          productSales[key] = { quantity: 0, revenue: 0, orders: 0 };
        }
        productSales[key].quantity += parseInt(item.quantity || 0);
        productSales[key].revenue += parseFloat(item.price || 0) * parseInt(item.quantity || 0);
        productSales[key].orders += 1;
      });
    });

    return productSales;
  }

  // ヘルパーメソッド: 日別グループ化
  groupByDay(orders) {
    const dailySales = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      if (!dailySales[date]) {
        dailySales[date] = { quantity: 0, revenue: 0, orders: 0 };
      }
      dailySales[date].revenue += parseFloat(order.total_price || 0);
      dailySales[date].orders += 1;
      dailySales[date].quantity += order.line_items?.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0) || 0;
    });

    return dailySales;
  }

  // ヘルパーメソッド: 月別グループ化
  groupByMonth(orders) {
    const monthlySales = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlySales[monthKey]) {
        monthlySales[monthKey] = { quantity: 0, revenue: 0, orders: 0 };
      }
      monthlySales[monthKey].revenue += parseFloat(order.total_price || 0);
      monthlySales[monthKey].orders += 1;
      monthlySales[monthKey].quantity += order.line_items?.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0) || 0;
    });

    return monthlySales;
  }

  // エラーハンドリング
  handleError(toolName, error) {
    console.error(`${toolName} error:`, error.message);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          tool: toolName,
          error: error.message,
          timestamp: new Date().toISOString(),
          suggestion: this.getErrorSuggestion(error)
        }, null, 2)
      }]
    };
  }

  getErrorSuggestion(error) {
    if (error.response?.status === 401) {
      return "Shopify認証エラー: アクセストークンを確認してください";
    } else if (error.response?.status === 404) {
      return "Shopifyストアが見つかりません: ストアURLを確認してください";
    } else if (error.response?.status === 429) {
      return "APIレート制限: しばらく待ってから再試行してください";
    } else {
      return "ネットワークまたはShopify API設定を確認してください";
    }
  }

  // 利用可能ツール一覧
  getAvailableTools() {
    return [
      {
        name: "get_orders",
        description: "指定期間のShopify注文データを取得します",
        inputSchema: {
          type: "object",
          properties: {
            startDate: { type: "string", description: "開始日 (YYYY-MM-DD)" },
            endDate: { type: "string", description: "終了日 (YYYY-MM-DD)" },
            status: { type: "string", description: "注文ステータス", enum: ["open", "closed", "cancelled", "any"], default: "any" },
            financialStatus: { type: "string", description: "支払いステータス", default: "paid" },
            limit: { type: "number", description: "最大取得件数", default: 50 }
          }
        }
      },
      {
        name: "get_products",
        description: "Shopify商品データを取得します",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "最大取得件数", default: 50 },
            vendor: { type: "string", description: "ベンダー名でフィルター" },
            productType: { type: "string", description: "商品タイプでフィルター" },
            status: { type: "string", description: "商品ステータス", default: "active" }
          }
        }
      },
      {
        name: "get_customers",
        description: "Shopify顧客データを取得します",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "最大取得件数", default: 50 },
            createdAfter: { type: "string", description: "指定日以降の顧客 (YYYY-MM-DD)" }
          }
        }
      },
      {
        name: "analyze_inventory",
        description: "在庫状況を分析し、低在庫・在庫切れ商品を特定します（高速処理版）",
        inputSchema: {
          type: "object",
          properties: {
            lowStockThreshold: { type: "number", description: "低在庫判定閾値", default: 10 },
            outOfStockOnly: { type: "boolean", description: "在庫切れのみ表示", default: false },
            limit: { type: "number", description: "チェックする商品数の上限", default: 50 }
          }
        }
      },
      {
        name: "analyze_sales",
        description: "売上データを分析し、指定した軸でグループ化します",
        inputSchema: {
          type: "object",
          properties: {
            startDate: { type: "string", description: "開始日 (YYYY-MM-DD)" },
            endDate: { type: "string", description: "終了日 (YYYY-MM-DD)" },
            groupBy: { 
              type: "string", 
              description: "グループ化軸", 
              enum: ["product", "category", "vendor", "day", "month"],
              default: "product"
            },
            limit: { type: "number", description: "結果件数", default: 20 }
          }
        }
      },
      {
        name: "analyze_customer_segments",
        description: "顧客をセグメント別に分析します（新規・リピート・VIP・非アクティブ）",
        inputSchema: {
          type: "object",
          properties: {
            minOrderCount: { type: "number", description: "リピート顧客の最小注文数", default: 2 },
            highValueThreshold: { type: "number", description: "VIP顧客の最小購入額", default: 50000 }
          }
        }
      }
    ];
  }

  // ツール呼び出しハンドラー
  async handleToolCall(toolName, params) {
    switch (toolName) {
      case 'get_orders':
        return await this.getOrders(params);
      case 'get_products':
        return await this.getProducts(params);
      case 'get_customers':
        return await this.getCustomers(params);
      case 'analyze_inventory':
        return await this.analyzeInventory(params);
      case 'analyze_sales':
        return await this.analyzeSales(params);
      case 'analyze_customer_segments':
        return await this.analyzeCustomerSegments(params);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  // MCP プロトコルハンドラー
  async handleRequest(request) {
    switch (request.method) {
      case 'tools/list':
        return { tools: this.getAvailableTools() };
      
      case 'tools/call':
        return await this.handleToolCall(request.params.name, request.params.arguments);
      
      default:
        throw new Error(`Unknown method: ${request.method}`);
    }
  }

  // サーバー実行
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

    // 初期化完了
    console.log(JSON.stringify({
      type: "initialization",
      serverInfo: {
        name: "true-shopify-mcp-server",
        version: this.version
      },
      capabilities: { tools: {} }
    }));
  }
}

// サーバー起動
if (require.main === module) {
  const server = new TrueShopifyMCPServer();
  server.run();
}

module.exports = TrueShopifyMCPServer;