const Anthropic = require('@anthropic-ai/sdk');
const { v4: uuidv4 } = require('uuid');

class AIAgent {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    this.systemPrompt = `あなたはGoogle Analyticsデータを分析する専門のAIエージェントです。
効率的で実用的な分析を提供します。

利用可能なツール:
1. get_ga_data - 基本GA4データ
2. get_top_pages - 人気ページ 
3. get_traffic_sources - トラフィック源

簡潔で実用的なレスポンスを提供してください。`;
  }

  async processQuery(userQuery, viewId) {
    try {
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
      
      // AIの回答から必要なアクションを解析
      const analysis = this.parseAIResponse(aiResponse, viewId);
      
      return {
        id: uuidv4(),
        query: userQuery,
        aiAnalysis: aiResponse,
        suggestedActions: analysis.actions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`AI処理エラー: ${error.message}`);
    }
  }

  parseAIResponse(aiResponse, viewId) {
    const actions = [];
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    // 効率的なキーワードマッチング
    const responseText = aiResponse.toLowerCase();

    // マーケティング関連の包括的な分析要求
    if (responseText.includes('マーケティング') || responseText.includes('戦略') || responseText.includes('プラン')) {
      actions.push(
        {
          tool: 'get_top_pages',
          params: { viewId, startDate: formatDate(thirtyDaysAgo), endDate: formatDate(today), maxResults: 10 }
        },
        {
          tool: 'get_traffic_sources', 
          params: { viewId, startDate: formatDate(thirtyDaysAgo), endDate: formatDate(today) }
        }
      );
    }
    // 人気ページ分析
    else if (responseText.includes('人気') || responseText.includes('ページ')) {
      actions.push({
        tool: 'get_top_pages',
        params: { viewId, startDate: formatDate(thirtyDaysAgo), endDate: formatDate(today), maxResults: 10 }
      });
    }
    // トラフィック分析
    else if (responseText.includes('トラフィック') || responseText.includes('流入') || responseText.includes('ソース')) {
      actions.push({
        tool: 'get_traffic_sources',
        params: { viewId, startDate: formatDate(thirtyDaysAgo), endDate: formatDate(today) }
      });
    }

    // デフォルト：基本データ取得
    if (actions.length === 0 || responseText.includes('セッション') || responseText.includes('ユーザー') || responseText.includes('pv')) {
      actions.push({
        tool: 'get_ga_data',
        params: {
          viewId,
          startDate: formatDate(thirtyDaysAgo),
          endDate: formatDate(today),
          metrics: ['sessions', 'totalUsers', 'screenPageViews'],
          dimensions: ['ga:date']
        }
      });
    }

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
      const analysis = this.parseAIResponse(aiResponse, viewId);
      
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
      // データを要約してプロンプトを軽量化
      const dataSummary = Object.entries(mcpResults).map(([tool, data]) => {
        if (data.content && data.content[0] && data.content[0].text) {
          return `${tool}: ${data.content[0].text.substring(0, 250)}`;
        }
        return `${tool}: データなし`;
      }).join('\n');

      const reportPrompt = `GA継続分析レポート
質問: ${query}

データ:
${dataSummary}

継続的な観点から実用的なレポートを作成してください。`;

      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        temperature: 0.3,
        system: "あなたはGoogle Analyticsのデータアナリストです。会話の流れを理解し、継続的で深い洞察を提供します。",
        messages: [
          { role: "user", content: reportPrompt }
        ]
      });

      return response.content[0].text;
    } catch (error) {
      throw new Error(`レポート生成エラー: ${error.message}`);
    }
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