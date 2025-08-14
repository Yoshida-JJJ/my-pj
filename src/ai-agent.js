const Anthropic = require('@anthropic-ai/sdk');
const { v4: uuidv4 } = require('uuid');
const TrueShopifyMCPServer = require('./true-shopify-mcp-server');

class AIAgent {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY環境変数が設定されていません。Netlifyの環境変数設定を確認してください。');
    }
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    // 真のMCPサーバーを初期化
    this.trueMCPServer = new TrueShopifyMCPServer();
    
    this.systemPrompt = `あなたは経験豊富なShopifyコマース分析専門家兼デジタルマーケティングコンサルタントです。

【専門分野】
・Shopify売上データ分析とインサイト抽出
・ECサイトパフォーマンス最適化
・商品戦略とマーケティング戦略立案
・ROI改善提案
・在庫管理と顧客分析

【真のMCPツール】（動的選択可能）
1. get_orders - Shopify注文データ取得（期間、ステータス指定可能）
2. get_products - Shopify商品データ取得（ベンダー、タイプ、ステータス指定可能）
3. get_customers - Shopify顧客データ取得（期間、条件指定可能）
4. analyze_inventory - 在庫分析（低在庫・在庫切れ特定）
5. analyze_sales - 売上分析（商品・カテゴリ・ベンダー・期間別グループ化）
6. analyze_customer_segments - 顧客セグメント分析（新規・リピート・VIP・非アクティブ）

【真のMCP動作原理】
✅ 自然言語クエリを分析して最適なツールを動的選択
✅ ユーザーの意図に基づく柔軟なパラメータ生成
✅ 複数ツールの組み合わせによる包括的分析
✅ リアルタイムShopify APIデータの活用
✅ コンテキストに応じた分析深度の調整
✅ ビジネス要求に最適化された戦略的洞察

【Shopify分析の重点事項】
✅ 実際の売上金額と注文履歴の詳細分析
✅ 商品別の売上パフォーマンス評価
✅ 顧客の購買パターンと季節性
✅ 商品カテゴリー別の収益性分析
✅ 在庫状況と売上実績の関連性
✅ 具体的な商品名と価格を含む戦略提案

【アウトプット品質基準】
✅ データドリブンな洞察とトレンド分析
✅ 具体的なアクションプランと優先順位
✅ KPI改善の定量的な提案
✅ 競合優位性の観点
✅ ROI向上のための戦略的提言
✅ リスクと機会の特定

【動的ツール選択の指針】
- 売上・ランキング → analyze_sales (groupBy: product/vendor/category)
- 在庫・商品管理 → analyze_inventory, get_products
- 顧客分析 → get_customers, analyze_customer_segments
- 注文詳細 → get_orders (期間・ステータス指定)
- 統合分析 → 複数ツールの組み合わせ

常にプロフェッショナルで洞察に富んだ、実行可能な提案を含む包括的な分析レポートを作成してください。`;
  }

  async processQuery(userQuery, viewId) {
    try {
      console.log('🚀 processQuery 開始:', userQuery);
      
      // 動的ツール選択の実行
      const selectedTools = await this.selectToolsDynamically(userQuery);
      
      if (selectedTools.length > 0) {
        console.log('🎯 真のMCP選択完了:', selectedTools.map(t => t.name));
        return {
          id: uuidv4(),
          query: userQuery,
          aiAnalysis: `真のMCP: 動的にツール選択しました - ${selectedTools.map(t => t.name).join(', ')}`,
          suggestedActions: selectedTools.map(tool => ({
            tool: tool.name,
            params: tool.params
          })),
          mcpMode: 'dynamic',
          timestamp: new Date().toISOString()
        };
      }
      
      // フォールバック: 従来の静的ロジック
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        temperature: 0.3,
        system: this.systemPrompt,
        messages: [
          { 
            role: "user", 
            content: `Google Analyticsビュー ID: ${viewId}\n質問: ${userQuery}\n\n適切なMCPツールを使用してデータを取得し、分析結果を提供してください。`
          }
        ]
      });

      const aiResponse = response.content[0].text;
      console.log('🤖 AI回答:', aiResponse.substring(0, 200) + '...');
      
      // AIの回答から必要なアクションを解析
      console.log('📊 parseAIResponse 呼び出し中...');
      const analysis = this.parseAIResponse(aiResponse, viewId, userQuery);
      
      return {
        id: uuidv4(),
        query: userQuery,
        aiAnalysis: aiResponse,
        suggestedActions: analysis.actions,
        mcpMode: 'static',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`AI処理エラー: ${error.message}`);
    }
  }

  extractDateRange(query) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const queryLower = query.toLowerCase();
    
    console.log('🔍 期間解析開始:', {
      originalQuery: query,
      queryLower: queryLower,
      today: today.toISOString().split('T')[0]
    });
    
    // 日本語の期間指定パターンをチェック
    
    // 「今年の○月から」パターン
    if (queryLower.includes('今年') && queryLower.includes('月')) {
      const monthMatch = queryLower.match(/([1-9]|1[0-2])月/);
      if (monthMatch) {
        const month = parseInt(monthMatch[1]);
        return {
          start: new Date(currentYear, month - 1, 1), // 指定月の1日
          end: today
        };
      }
      // 「今年の1月から」のように具体的な月が指定されている場合
      if (queryLower.includes('1月') || queryLower.includes('１月')) {
        return {
          start: new Date(currentYear, 0, 1), // 今年の1月1日
          end: today
        };
      }
      // 今年の開始
      return {
        start: new Date(currentYear, 0, 1),
        end: today
      };
    }
    
    // 「1年間」「過去1年」「1年」の特別パターン
    if (queryLower.includes('1年間') || queryLower.includes('過去1年') || 
        queryLower.match(/(?:過去\s*)?1\s*年(?!\d)/)) {
      console.log('📅 1年間指定検出');
      return {
        start: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
        end: today
      };
    }
    
    // 「昨年から」「去年から」パターン
    if (queryLower.includes('昨年') || queryLower.includes('去年')) {
      return {
        start: new Date(currentYear - 1, 0, 1), // 昨年の1月1日
        end: today
      };
    }
    
    // 「過去○年間」「○年間」パターン
    const yearsMatch = queryLower.match(/(?:過去\s*)?(\d+)\s*年(?:間)?/);
    if (yearsMatch) {
      const years = parseInt(yearsMatch[1]);
      console.log(`📅 年間指定検出: ${years}年間`);
      return {
        start: new Date(today.getFullYear() - years, today.getMonth(), today.getDate()),
        end: today
      };
    }
    
    // 「過去○ヶ月」パターン
    const monthsMatch = queryLower.match(/過去\s*(\d+)\s*[ヶケ]?月/);
    if (monthsMatch) {
      const months = parseInt(monthsMatch[1]);
      return {
        start: new Date(today.getFullYear(), today.getMonth() - months, today.getDate()),
        end: today
      };
    }
    
    // 「過去○日」「○日間」パターン
    const daysMatch = queryLower.match(/(?:過去\s*)?(\d+)\s*日/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      return {
        start: new Date(today.getTime() - (days * 24 * 60 * 60 * 1000)),
        end: today
      };
    }
    
    // 「先月」パターン
    if (queryLower.includes('先月')) {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        start: lastMonth,
        end: lastMonthEnd
      };
    }
    
    // 「今月」パターン
    if (queryLower.includes('今月')) {
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: today
      };
    }
    
    // 「全期間」「すべて」「全部」パターン
    if (queryLower.includes('全期間') || queryLower.includes('すべて') || queryLower.includes('全部')) {
      return {
        start: new Date(2020, 0, 1), // 2020年1月1日から
        end: today
      };
    }
    
    // 「ランキング」「売上」などが含まれている場合はより長い期間を使用
    if (queryLower.includes('ランキング') || queryLower.includes('売上') || queryLower.includes('商品別')) {
      return {
        start: new Date(currentYear, 0, 1), // 今年の1月1日から
        end: today
      };
    }
    
    console.log('📅 どのパターンにもマッチしなかったため、デフォルト期間を使用');
    
    // デフォルト: 過去30日
    const defaultRange = {
      start: new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000)),
      end: today
    };
    
    console.log('📅 デフォルト期間:', {
      start: defaultRange.start.toISOString().split('T')[0],
      end: defaultRange.end.toISOString().split('T')[0]
    });
    
    return defaultRange;
  }

  // 新しい動的ツール選択メソッド
  async selectToolsDynamically(userQuery) {
    console.log('🧠 動的ツール選択開始:', userQuery);
    
    // MCPサーバーの初期化チェック
    if (!this.trueMCPServer) {
      console.warn('⚠️ trueMCPServerが初期化されていません');
      return this.fallbackToolSelection(userQuery);
    }
    
    try {
      const availableTools = this.trueMCPServer.getAvailableTools();
      console.log('🛠️ 利用可能ツール:', availableTools.map(t => t.name));
    
      const toolSelectionPrompt = `以下のユーザー質問に最適なShopify分析ツールを選択してください：

質問: "${userQuery}"

利用可能なツール:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

複合的な質問の場合は複数のツールを選択してください。
最適なツールを1-3個選択し、必要なパラメータを生成してください。
JSON形式で回答：
{
  "selectedTools": [
    {
      "name": "ツール名",
      "params": { "必要なパラメータ": "値" },
      "reason": "選択理由"
    }
  ]
}`;

      const response = await Promise.race([
        this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          temperature: 0.1,
          messages: [{ role: "user", content: toolSelectionPrompt }]
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('ツール選択タイムアウト')), 30000))
      ]);

      const selection = JSON.parse(response.content[0].text);
      console.log('🎯 動的選択結果:', selection);
      
      return selection.selectedTools || [];
    } catch (error) {
      console.error('❌ 動的選択エラー:', error.message);
      console.error('エラー詳細:', error.stack);
      return this.fallbackToolSelection(userQuery);
    }
  }

  // フォールバック用のシンプルな選択ロジック
  fallbackToolSelection(userQuery) {
    const queryLower = userQuery.toLowerCase();
    const dateRange = this.extractDateRange(userQuery);
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const startDate = formatDate(dateRange.start);
    const endDate = formatDate(dateRange.end);
    
    console.log('📋 フォールバック選択ロジック実行中:', queryLower);
    
    // 複合クエリ：販売実績と在庫状況の戦略分析
    if ((queryLower.includes('販売') || queryLower.includes('売上')) && 
        queryLower.includes('在庫') && 
        (queryLower.includes('戦略') || queryLower.includes('仕入れ'))) {
      console.log('🔄 複合クエリ検出: 販売実績+在庫状況+戦略分析');
      return [
        {
          name: 'analyze_sales',
          params: { startDate, endDate, groupBy: 'product', limit: 15 },
          reason: '販売実績分析'
        },
        {
          name: 'analyze_inventory',
          params: { 
            lowStockThreshold: 15, 
            limit: 100,
            outOfStockOnly: false
          },
          reason: '在庫状況分析'
        }
      ];
    }
    
    // 売上ランキング単体
    if (queryLower.includes('売上') && queryLower.includes('ランキング')) {
      return [{
        name: 'analyze_sales',
        params: { startDate, endDate, groupBy: 'product', limit: 20 },
        reason: '売上ランキング要求'
      }];
    }
    
    // 在庫分析単体
    if (queryLower.includes('在庫')) {
      return [{
        name: 'analyze_inventory',
        params: { 
          lowStockThreshold: 10, 
          limit: 200,
          outOfStockOnly: queryLower.includes('在庫切れ') || queryLower.includes('なくなって')
        },
        reason: '在庫分析要求'
      }];
    }
    
    // デフォルト
    console.log('🔧 デフォルト選択: 基本注文分析');
    return [{
      name: 'get_orders',
      params: { startDate, endDate, status: 'any', limit: 50 },
      reason: 'デフォルト注文分析'
    }];
  }

  parseAIResponse(aiResponse, viewId, userQuery = '') {
    const actions = [];
    const today = new Date();
    
    const formatDate = (date) => {
      // タイムゾーンを考慮した日付フォーマット
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // ユーザークエリから期間を動的に解析
    const dateRange = this.extractDateRange(userQuery);
    const startDate = formatDate(dateRange.start);
    const endDate = formatDate(dateRange.end);
    
    console.log('📅 解析された期間:', { startDate, endDate, original: userQuery });
    
    // ユーザーの質問からキーワードマッチング（強制デバッグ付き）
    const queryText = userQuery.toLowerCase();
    const responseText = aiResponse.toLowerCase();

    console.log('🔍 AIエージェント デバッグ:');
    console.log('  ユーザー質問:', userQuery);
    console.log('  小文字変換:', queryText);
    
    // 真のMCP：動的ツール選択を優先
    const shouldUseDynamicSelection = queryText.includes('shopify') || queryText.includes('売上') || 
                                     queryText.includes('商品') || queryText.includes('ランキング') ||
                                     queryText.includes('在庫') || queryText.includes('顧客');
    
    if (shouldUseDynamicSelection) {
      console.log('🚀 真のMCP: 動的ツール選択を実行中...');
      // 動的選択は非同期のため、後でprocessQueryで処理
      actions.push({
        tool: 'dynamic_mcp_selection',
        params: { query: userQuery, startDate, endDate }
      });
      return { actions };
    }
    
    // Shopify関連の分析要求（最優先で強制実行）
    const hasShopifyRequest = queryText.includes('shopify') || queryText.includes('売上') || queryText.includes('注文') || 
                             queryText.includes('商品') || queryText.includes('ec') || queryText.includes('eコマース') || 
                             queryText.includes('購入') || queryText.includes('決済') || queryText.includes('オーダー') ||
                             queryText.includes('ランキング') || queryText.includes('仕入れ') || queryText.includes('戦略') ||
                             queryText.includes('1月から') || queryText.includes('今年') ||
                             responseText.includes('shopify') || responseText.includes('売上') || responseText.includes('注文');
    
    console.log('  Shopify検出:', hasShopifyRequest);
    
    if (hasShopifyRequest) {
      console.log('  ✅ Shopifyツールを追加中...');
      
      // 売上ランキングの特別検出（強化版）
      const hasRankingRequest = queryText.includes('ランキング') || queryText.includes('ranking') || 
                               queryText.includes('売上ランキング') || queryText.includes('商品別') ||
                               queryText.includes('仕入れ') || queryText.includes('戦略') ||
                               queryText.includes('1月から') || queryText.includes('今年') ||
                               (queryText.includes('売上') && queryText.includes('商品')) ||
                               (queryText.includes('ランキング') && queryText.includes('出し'));
      
      console.log('  🔍 売上ランキング検出条件チェック:');
      console.log('    - ランキング:', queryText.includes('ランキング'));
      console.log('    - 商品別:', queryText.includes('商品別'));
      console.log('    - 仕入れ:', queryText.includes('仕入れ'));
      console.log('    - 戦略:', queryText.includes('戦略'));
      console.log('    - 1月から:', queryText.includes('1月から'));
      console.log('    - 今年:', queryText.includes('今年'));
      console.log('    - 売上+商品:', queryText.includes('売上') && queryText.includes('商品'));
      console.log('    - 総合判定:', hasRankingRequest);
      
      if (hasRankingRequest) {
        console.log('  🏆 売上ランキング機能を使用...');
        actions.push({
          tool: 'get_shopify_sales_ranking',
          params: { startDate, endDate, maxResults: 20 }
        });
      } else {
        // 通常のShopify注文データ
        actions.push({
          tool: 'get_shopify_orders',
          params: { viewId, startDate, endDate, maxResults: 50 }
        });
        
        if (queryText.includes('商品') || queryText.includes('product') || responseText.includes('商品') || responseText.includes('product')) {
          actions.push({
            tool: 'get_shopify_products',
            params: { viewId, startDate, endDate, maxResults: 20 }
          });
        }
      }
      
      if (queryText.includes('統合') || queryText.includes('比較') || queryText.includes('分析') || responseText.includes('統合') || responseText.includes('比較') || responseText.includes('分析')) {
        actions.push({
          tool: 'get_integrated_analysis',
          params: { viewId, startDate, endDate }
        });
      }
    }
    // マーケティング関連の包括的な分析要求
    else if (responseText.includes('マーケティング') || responseText.includes('戦略') || responseText.includes('プラン')) {
      actions.push(
        {
          tool: 'get_top_pages',
          params: { viewId, startDate, endDate, maxResults: 10 }
        },
        {
          tool: 'get_traffic_sources', 
          params: { viewId, startDate, endDate }
        }
      );
    }
    // 人気ページ分析
    else if (responseText.includes('人気') || responseText.includes('ページ')) {
      actions.push({
        tool: 'get_top_pages',
        params: { viewId, startDate, endDate, maxResults: 10 }
      });
    }
    // トラフィック分析
    else if (responseText.includes('トラフィック') || responseText.includes('流入') || responseText.includes('ソース')) {
      actions.push({
        tool: 'get_traffic_sources',
        params: { viewId, startDate, endDate }
      });
    }

    // デフォルト：基本データ取得（Shopifyが要求されていない場合のみ）
    if (actions.length === 0) {
      // Shopifyキーワードが全く含まれていない場合のみGA4を追加
      if (!hasShopifyRequest) {
        console.log('  ✅ GA4ツールを追加中...');
        actions.push({
          tool: 'get_ga_data',
          params: {
            viewId,
            startDate,
            endDate,
            metrics: ['sessions', 'totalUsers', 'screenPageViews'],
            dimensions: ['ga:date']
          }
        });
      } else {
        console.log('  ❌ Shopify要求があるためGA4をスキップ');
      }
    }

    console.log('  🎯 最終結果 - 呼び出すツール:', actions.map(a => a.tool));
    return { actions };
  }

  async generateReport(query, mcpResults, aiAnalysis) {
    try {
      // データを要約してプロンプトを軽量化
      const dataSummary = Object.entries(mcpResults).map(([tool, data]) => {
        if (data.content && data.content[0] && data.content[0].text) {
          return `${tool}: ${data.content[0].text.substring(0, 300)}`;
        }
        return `${tool}: データなし`;
      }).join('\n\n');

      const reportPrompt = `GA分析レポート作成
質問: ${query}

データ概要:
${dataSummary}

実用的なレポートを簡潔に作成してください。`;

      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        temperature: 0.3,
        system: "あなたはGoogle Analyticsのデータアナリストです。データを分析し、実用的なインサイトとレポートを提供します。",
        messages: [
          { role: "user", content: reportPrompt }
        ]
      });

      return {
        id: uuidv4(),
        originalQuery: query,
        report: response.content[0].text,
        data: mcpResults,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`レポート生成エラー: ${error.message}`);
    }
  }

  async interpretQuery(query) {
    const interpretationPrompt = `以下の質問を分析し、必要なGoogle Analyticsデータとクエリパラメータを特定してください：

質問: "${query}"

回答形式（JSON）:
{
  "intent": "質問の意図",
  "timeframe": "期間（デフォルト30日）",
  "metrics": ["必要なメトリクス配列"],
  "dimensions": ["必要なディメンション配列"],
  "tools": ["使用すべきMCPツール"],
  "priority": "high/medium/low"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          { role: "user", content: interpretationPrompt }
        ]
      });

      return JSON.parse(response.content[0].text);
    } catch (error) {
      // フォールバック解析
      return this.fallbackInterpretation(query);
    }
  }

  async processQueryWithHistory(userQuery, viewId, conversationHistory) {
    try {
      // 最新の会話のみを簡潔に参照
      const recentContext = conversationHistory.slice(-2).map(msg => 
        msg.role === 'user' ? `前回質問: ${msg.content.substring(0, 100)}` : ''
      ).filter(Boolean).join('\n');

      const contextualPrompt = `Google Analytics分析要求: ${userQuery}
ビューID: ${viewId}
${recentContext ? `\n前回の文脈: ${recentContext}` : ''}

適切なデータを取得し、簡潔で実用的な分析を提供してください。`;

      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        temperature: 0.3,
        system: this.systemPrompt,
        messages: [
          { role: "user", content: contextualPrompt }
        ]
      });

      const aiResponse = response.content[0].text;
      const analysis = this.parseAIResponse(aiResponse, viewId, userQuery);
      
      return {
        id: uuidv4(),
        query: userQuery,
        aiAnalysis: aiResponse,
        suggestedActions: analysis.actions,
        conversationContext: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`AI処理エラー: ${error.message}`);
    }
  }

  async generateReportWithHistory(query, mcpResults, aiAnalysis, conversationHistory) {
    try {
      // データの構造化分析
      const structuredData = this.structureAnalysisData(mcpResults);
      
      // 前回の会話コンテキスト
      const recentContext = conversationHistory.slice(-2).map(msg => 
        msg.role === 'user' ? `前回の関心: ${msg.content.substring(0, 80)}` : ''
      ).filter(Boolean).join('\n');

      const reportPrompt = `【Shopify売上中心の戦略分析レポート作成】

📋 **分析要求**: ${query}

📊 **データ概要**:
${structuredData.summary}

🔍 **詳細データ**:
${structuredData.details}

${recentContext ? `🔄 **会話コンテキスト**:\n${recentContext}\n` : ''}

🚨 **重要指示**:
- Shopifyの売上データ（get_shopify_orders、get_shopify_products）を分析の中心とする
- 実際の注文金額、商品名、売上実績を必ず含める
- GA4データは補助的な情報として使用する
- 商品の実際の売上パフォーマンスに基づいて戦略を立案する

【求められるアウトプット形式】

📈 **エグゼクティブサマリー**
- 主要な発見事項（3-5つの重要ポイント）
- ビジネスインパクトの数値評価

📊 **詳細分析**
- トレンド分析と変化要因
- パフォーマンス指標の評価
- 競合・業界ベンチマークとの比較視点

🎯 **戦略的提言**
- 具体的な改善アクション（優先度付き）
- 期待される効果の定量予測
- 実装タイムラインの提案

⚠️ **リスクと機会**
- 注意すべき指標の動向
- 未活用の成長機会
- 競合優位性の強化ポイント

📋 **次回分析への推奨事項**
- 継続モニタリング指標
- 深掘り分析の提案

必ずデータドリブンで実行可能な洞察を含む包括的なレポートを作成してください。`;

      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2500,
        temperature: 0.3,
        system: this.systemPrompt,
        messages: [
          { role: "user", content: reportPrompt }
        ]
      });

      return response.content[0].text;
    } catch (error) {
      // エラー時も基本的な分析を提供
      return this.generateFallbackReport(query, mcpResults);
    }
  }

  structureAnalysisData(mcpResults) {
    const summary = [];
    const details = [];
    
    // Shopifyデータを最優先で処理
    const priorityOrder = ['get_shopify_orders', 'get_shopify_products', 'get_integrated_analysis'];
    const otherTools = Object.keys(mcpResults).filter(tool => !priorityOrder.includes(tool));
    const orderedTools = [...priorityOrder, ...otherTools];
    
    orderedTools.forEach(tool => {
      if (!mcpResults[tool]) return;
      
      const data = mcpResults[tool];
      if (data.content && data.content[0] && data.content[0].text) {
        const text = data.content[0].text;
        
        // Shopifyデータの場合はより詳細に表示
        if (tool.includes('shopify')) {
          summary.push(`🛒 ${tool}: Shopifyデータ取得済み（優先分析対象）`);
          details.push(`🛒 **${tool}** (優先データ):\n${text}\n`);
        } else {
          // 数値データの抽出
          const numbers = text.match(/(\d{1,3}(?:,\d{3})*|\d+)/g) || [];
          const keyMetrics = numbers.slice(0, 5).join(', ');
          
          summary.push(`${tool}: ${keyMetrics ? `主要数値: ${keyMetrics}` : 'データ取得済み'}`);
          details.push(`${tool}:\n${text.substring(0, 400)}\n`);
        }
      } else if (data.error) {
        summary.push(`${tool}: エラー - ${data.error}`);
        details.push(`${tool}: ${data.error}\n`);
      }
    });
    
    return {
      summary: summary.join('\n'),
      details: details.join('\n---\n')
    };
  }

  generateFallbackReport(query, mcpResults) {
    const hasData = Object.values(mcpResults).some(result => 
      result.content && result.content[0] && result.content[0].text
    );
    
    if (!hasData) {
      return `【分析レポート】

📋 **分析要求**: ${query}

⚠️ **データ取得状況**: 一部のデータ取得でエラーが発生していますが、利用可能な情報で分析を実施します。

🔍 **推奨アクション**:
1. データ取得エラーの確認と修正
2. 代替データソースの活用検討
3. 手動でのGA4ダッシュボード確認

📈 **継続分析のための提案**:
- API接続の安定化
- より具体的な質問での再分析
- 期間を変更した分析の実施

引き続きサポートいたします。より具体的な質問でお試しください。`;
    }
    
    // 基本的なデータサマリー
    const dataOverview = Object.entries(mcpResults)
      .filter(([_, data]) => data.content && data.content[0])
      .map(([tool, data]) => `${tool}: ${data.content[0].text.substring(0, 200)}...`)
      .join('\n\n');
    
    return `【分析レポート】

📋 **分析要求**: ${query}

📊 **データ概要**:
${dataOverview}

🎯 **基本的な洞察**:
データが正常に取得されました。より詳細な分析については、具体的な改善点や期間を指定した再分析をお勧めします。

📈 **次のステップ**:
1. 特定の指標に焦点を当てた深堀り分析
2. 競合比較分析の実施
3. 改善施策の効果測定設計`;
  }

  fallbackInterpretation(query) {
    const query_lower = query.toLowerCase();
    
    if (query_lower.includes('ページ') || query_lower.includes('コンテンツ')) {
      return {
        intent: "ページパフォーマンス分析",
        timeframe: "30日",
        metrics: ["ga:pageviews", "ga:uniquePageviews"],
        dimensions: ["ga:pagePath"],
        tools: ["get_top_pages"],
        priority: "high"
      };
    }
    
    if (query_lower.includes('トラフィック') || query_lower.includes('流入')) {
      return {
        intent: "トラフィック分析",
        timeframe: "30日", 
        metrics: ["ga:sessions", "ga:users"],
        dimensions: ["ga:source", "ga:medium"],
        tools: ["get_traffic_sources"],
        priority: "high"
      };
    }
    
    return {
      intent: "基本分析",
      timeframe: "30日",
      metrics: ["ga:sessions", "ga:users", "ga:pageviews"],
      dimensions: ["ga:date"],
      tools: ["get_ga_data"],
      priority: "medium"
    };
  }
}

module.exports = AIAgent;