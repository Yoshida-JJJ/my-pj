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
      timeout: 300000  // 5分に延長（大量データ対応）
    });

    return response.data;
  }

  // 大量データ用最適化取得メソッド
  async getOrdersOptimized(params, daysDiff) {
    try {
      const { startDate, endDate, status = 'any', financialStatus = 'paid', limit = 50 } = params;
      
      console.log(`🚀 最適化処理開始: ${daysDiff}日間のデータを効率的に取得`);
      
      // 1年間データの場合は月別に分割して取得
      if (daysDiff > 300) {
        console.log('📅 1年間データ - 月別分割取得を実行');
        return await this.getOrdersByMonths(params);
      }
      
      // 6ヶ月未満は週別取得
      console.log('📅 中期間データ - 効率化取得を実行');
      return await this.getOrdersEfficient(params);
      
    } catch (error) {
      console.error('❌ 最適化取得エラー:', error);
      throw error;
    }
  }

  // 月別分割取得（メモリ効率化版）
  async getOrdersByMonths(params) {
    try {
      const { startDate, endDate, status = 'any', financialStatus = 'paid' } = params;
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      console.log('📊 メモリ効率化月別データ取得開始...');
      
      // メモリ効率化: 全データを保持せず、集計のみ実行
      const salesSummary = new Map(); // 商品別売上集計
      const monthlySummary = new Map(); // 月別集計
      let totalOrders = 0;
      let totalRevenue = 0;
      
      const months = [];
      
      // 月ごとの期間を生成
      let currentDate = new Date(start.getFullYear(), start.getMonth(), 1);
      while (currentDate <= end) {
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        months.push({
          start: new Date(currentDate),
          end: monthEnd > end ? end : monthEnd
        });
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }
      
      console.log(`📅 ${months.length}ヶ月に分割して集計処理`);
      
      // 月別にストリーミング処理（メモリ効率化）
      for (let i = 0; i < months.length; i++) {
        const month = months[i];
        console.log(`📆 ${i+1}/${months.length}月目処理: ${month.start.toISOString().split('T')[0]} ～ ${month.end.toISOString().split('T')[0]}`);
        
        const apiParams = {
          status,
          financial_status: financialStatus,
          limit: 250,
          created_at_min: month.start.toISOString(),
          created_at_max: month.end.toISOString(),
          fields: 'id,created_at,total_price,line_items' // 最小限のフィールド
        };
        
        try {
          const data = await this.makeShopifyRequest('/orders.json', apiParams);
          const monthOrders = data.orders || [];
          
          // ストリーミング集計（メモリ効率化）
          let monthRevenue = 0;
          monthOrders.forEach(order => {
            const orderTotal = parseFloat(order.total_price || 0);
            totalRevenue += orderTotal;
            monthRevenue += orderTotal;
            totalOrders++;
            
            // 商品別集計（即座に処理、注文データは保持しない）
            order.line_items?.forEach(item => {
              const productName = item.name || 'Unknown Product';
              const itemRevenue = parseFloat(item.price || 0) * parseInt(item.quantity || 0);
              const itemQuantity = parseInt(item.quantity || 0);
              
              if (!salesSummary.has(productName)) {
                salesSummary.set(productName, { revenue: 0, quantity: 0, orders: 0 });
              }
              
              const current = salesSummary.get(productName);
              salesSummary.set(productName, {
                revenue: current.revenue + itemRevenue,
                quantity: current.quantity + itemQuantity,
                orders: current.orders + 1
              });
            });
          });
          
          // 月別集計
          const monthKey = `${month.start.getFullYear()}-${String(month.start.getMonth() + 1).padStart(2, '0')}`;
          monthlySummary.set(monthKey, {
            orders: monthOrders.length,
            revenue: monthRevenue
          });
          
          console.log(`✅ ${i+1}月目完了: ${monthOrders.length}件処理 (月売上: ¥${monthRevenue.toLocaleString()})`);
          
          // 月別データを即座に破棄（メモリ解放）
          monthOrders.length = 0;
          
          // レート制限対応（0.8秒待機）
          if (i < months.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
          
        } catch (monthError) {
          console.error(`❌ ${i+1}月目取得エラー:`, monthError.message);
          continue;
        }
      }
      
      // 集計結果を配列に変換（上位20商品のみ）
      const topProducts = Array.from(salesSummary.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 20)
        .map(([name, data]) => ({
          product: name,
          revenue: data.revenue,
          quantity: data.quantity,
          orders: data.orders,
          averagePrice: data.quantity > 0 ? (data.revenue / data.quantity) : 0
        }));
      
      const monthlyData = Array.from(monthlySummary.entries())
        .map(([month, data]) => ({ month, ...data }));
      
      console.log(`🎉 メモリ効率化処理完了: ${totalOrders}件の注文を集計`);
      console.log(`💰 総売上: ¥${totalRevenue.toLocaleString()}`);
      console.log(`📊 メモリ使用量: 集計データのみ保持`);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tool: 'get_orders_memory_optimized',
            totalOrders: totalOrders,
            totalRevenue: totalRevenue,
            averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders) : 0,
            period: `${startDate} to ${endDate}`,
            topProducts: topProducts,
            monthlyBreakdown: monthlyData,
            optimizationMethod: 'streaming_aggregation',
            monthsProcessed: months.length,
            memoryEfficient: true,
            dataReduction: `Raw data discarded, summary retained`
          }, null, 2)
        }]
      };
      
    } catch (error) {
      throw new Error(`メモリ効率化月別取得エラー: ${error.message}`);
    }
  }

  // 効率化取得（中期間データ対応）
  async getOrdersEfficient(params) {
    const { startDate, endDate, status = 'any', financialStatus = 'paid', limit = 50 } = params;
    
    console.log('⚡ 効率化取得実行中...');
    
    // 最初に件数をチェック
    const countParams = {
      status,
      financial_status: financialStatus,
      limit: 1,
      created_at_min: new Date(startDate).toISOString(),
      created_at_max: new Date(endDate).toISOString(),
      fields: 'id'
    };
    
    const countData = await this.makeShopifyRequest('/orders/count.json', countParams);
    const totalCount = countData.count || 0;
    
    console.log(`📊 総注文数: ${totalCount}件`);
    
    if (totalCount <= 250) {
      // 通常取得で十分
      const apiParams = {
        status,
        financial_status: financialStatus,
        limit: Math.min(limit, 250),
        created_at_min: new Date(startDate).toISOString(),
        created_at_max: new Date(endDate).toISOString()
      };
      
      const data = await this.makeShopifyRequest('/orders.json', apiParams);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tool: 'get_orders_efficient',
            orderCount: data.orders?.length || 0,
            orders: data.orders || [],
            period: `${startDate} to ${endDate}`,
            optimizationMethod: 'single_request'
          }, null, 2)
        }]
      };
    }
    
    // 大量データの場合は制限を告知
    const limitedParams = {
      status,
      financial_status: financialStatus,
      limit: 250, // 最大取得
      created_at_min: new Date(startDate).toISOString(),
      created_at_max: new Date(endDate).toISOString(),
      order: 'created_at desc' // 最新順
    };
    
    const data = await this.makeShopifyRequest('/orders.json', limitedParams);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          tool: 'get_orders_efficient',
          orderCount: data.orders?.length || 0,
          orders: data.orders || [],
          period: `${startDate} to ${endDate}`,
          totalAvailable: totalCount,
          retrieved: data.orders?.length || 0,
          optimizationMethod: 'limited_recent_data',
          note: totalCount > 250 ? `注意: ${totalCount}件中、最新の${data.orders?.length || 0}件を表示` : 'complete_data'
        }, null, 2)
      }]
    };
  }

  // ツール1: 基本的な注文取得（大量データ対応版）
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

      console.log('📊 注文データ取得開始:', { startDate, endDate, limit });

      // 期間長さを計算してデータ量を推定
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      
      console.log(`📅 分析期間: ${daysDiff}日間 (${start.toISOString().split('T')[0]} ～ ${end.toISOString().split('T')[0]})`);

      // 大量データの場合は段階的取得を実装
      if (daysDiff > 180 || limit > 250) {
        console.log('🔄 大量データ検出 - 最適化処理を実行');
        return await this.getOrdersOptimized(params, daysDiff);
      }

      // 通常処理
      const apiParams = {
        status,
        financial_status: financialStatus,
        limit: Math.min(limit, 250)
      };

      if (startDate) {
        apiParams.created_at_min = new Date(startDate).toISOString();
        console.log(`📅 開始日設定: ${startDate} → ${apiParams.created_at_min}`);
      }
      if (endDate) {
        apiParams.created_at_max = new Date(endDate).toISOString();
        console.log(`📅 終了日設定: ${endDate} → ${apiParams.created_at_max}`);
      }
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
        limit: Math.min(limit, 250), // 最大250商品まで処理
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

  // ツール5: 売上分析（メモリ効率化対応）
  async analyzeSales(params) {
    try {
      const {
        startDate,
        endDate,
        groupBy = 'product', // product, category, vendor, day, month
        limit = 20
      } = params;

      console.log('📊 売上分析開始:', { startDate, endDate, groupBy, limit });

      // 期間長さをチェックして処理方法を決定
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 300) {
          console.log('🔄 大量データ売上分析 - 最適化処理を実行');
          return await this.analyzeSalesOptimized(params, daysDiff);
        }
      }

      // 通常処理
      const apiParams = {
        status: 'any',
        financial_status: 'paid',
        limit: 250
      };

      if (startDate) {
        apiParams.created_at_min = new Date(startDate).toISOString();
        console.log(`📊 売上分析開始日: ${startDate} → ${apiParams.created_at_min}`);
      }
      if (endDate) {
        apiParams.created_at_max = new Date(endDate).toISOString();
        console.log(`📊 売上分析終了日: ${endDate} → ${apiParams.created_at_max}`);
      }

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

  // 売上分析最適化版（大量データ対応）
  async analyzeSalesOptimized(params, daysDiff) {
    try {
      const { startDate, endDate, groupBy = 'product', limit = 20 } = params;
      
      console.log(`🚀 売上分析最適化処理: ${daysDiff}日間 (groupBy: ${groupBy})`);
      
      // getOrdersByMonths の結果を利用（重複処理を避ける）
      const ordersResult = await this.getOrdersByMonths(params);
      const ordersData = JSON.parse(ordersResult.content[0].text);
      
      if (ordersData.tool === 'get_orders_memory_optimized') {
        // 既に集計済みのデータを使用
        console.log('📊 メモリ効率化データから売上分析を生成');
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              tool: 'analyze_sales_optimized',
              period: `${startDate} to ${endDate}`,
              groupBy: groupBy,
              totalOrders: ordersData.totalOrders,
              totalRevenue: ordersData.totalRevenue,
              results: ordersData.topProducts.slice(0, limit),
              monthlyBreakdown: ordersData.monthlyBreakdown,
              optimizationMethod: 'memory_efficient_aggregation',
              dataSource: 'reused_from_orders_analysis'
            }, null, 2)
          }]
        };
      }
      
      // フォールバック処理
      throw new Error('最適化データが利用できません');
      
    } catch (error) {
      console.error('❌ 売上分析最適化エラー:', error.message);
      throw error;
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