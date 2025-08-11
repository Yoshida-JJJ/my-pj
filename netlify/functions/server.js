const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const { google } = require('googleapis');
const AIAgent = require('../../src/ai-agent');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Netlify環境では常に本番環境として扱う
if (process.env.NODE_ENV === 'production' && process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASS) {
  const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER;
  const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS;
  
  app.use((req, res, next) => {
    // OAuth認証のコールバックはBasic認証をスキップ
    if (req.path === '/auth/callback') {
      return next();
    }
    
    const auth = req.headers.authorization;
    const expectedAuth = 'Basic ' + Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}`).toString('base64');
    
    if (!auth || auth !== expectedAuth) {
      res.set('WWW-Authenticate', 'Basic realm="GA Analytics Access"');
      return res.status(401).send('認証が必要です');
    }
    next();
  });
}

// Netlify環境では静的ファイル配信は不要
// app.use(express.static(path.join(__dirname, '../../public')));

const aiAgent = new AIAgent();

// チャット履歴管理
const chatSessions = new Map();

function getOrCreateSession(sessionId) {
  if (!chatSessions.has(sessionId)) {
    chatSessions.set(sessionId, {
      id: sessionId,
      history: [],
      createdAt: new Date(),
      lastActivity: new Date()
    });
  }
  return chatSessions.get(sessionId);
}

// Google Analytics直接統合クラス（MCPサーバーの代替）
class GAAnalytics {
  constructor() {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    this.analyticsData = google.analyticsdata('v1beta');
  }

  async callTool(toolName, params) {
    try {
      const { authTokens, viewId, startDate, endDate } = params;
      
      if (!authTokens) {
        throw new Error('Google認証が完了していません。🔑Google認証ボタンをクリックしてください。');
      }

      this.auth.setCredentials(authTokens);
      
      // GA4 Property IDの処理
      let propertyId;
      if (viewId && viewId.startsWith('G-')) {
        propertyId = process.env.GA4_PROPERTY_ID || '419224498';
      } else {
        propertyId = viewId || process.env.GA4_PROPERTY_ID || '419224498';
      }

      let response;
      
      switch (toolName) {
        case 'get_top_pages':
          response = await this.analyticsData.properties.runReport({
            auth: this.auth,
            property: `properties/${propertyId}`,
            requestBody: {
              dateRanges: [{ startDate, endDate }],
              metrics: [
                { name: 'screenPageViews' },
                { name: 'sessions' },
                { name: 'averageSessionDuration' }
              ],
              dimensions: [
                { name: 'pagePath' },
                { name: 'pageTitle' }
              ],
              orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
              limit: params.maxResults || 10
            }
          });
          
          return {
            content: [{
              type: 'text',
              text: `人気ページランキング (${startDate} - ${endDate}):\n\n${
                response.data.rows?.map((row, index) => 
                  `${index + 1}. ${row.dimensionValues[1]?.value || 'タイトル不明'}\n   URL: ${row.dimensionValues[0]?.value}\n   PV: ${row.metricValues[0]?.value}, セッション: ${row.metricValues[1]?.value}, 滞在時間: ${Math.round(row.metricValues[2]?.value || 0)}秒\n`
                ).join('\n') || 'データがありません'
              }`
            }]
          };

        case 'get_traffic_sources':
          response = await this.analyticsData.properties.runReport({
            auth: this.auth,
            property: `properties/${propertyId}`,
            requestBody: {
              dateRanges: [{ startDate, endDate }],
              metrics: [
                { name: 'sessions' },
                { name: 'totalUsers' }
              ],
              dimensions: [
                { name: 'source' },
                { name: 'medium' }
              ],
              orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
            }
          });
          
          return {
            content: [{
              type: 'text',
              text: `トラフィック源 (${startDate} - ${endDate}):\n\n${
                response.data.rows?.map(row => 
                  `${row.dimensionValues[0]?.value}/${row.dimensionValues[1]?.value}: セッション ${row.metricValues[0]?.value}, ユーザー ${row.metricValues[1]?.value}`
                ).join('\n') || 'データがありません'
              }`
            }]
          };

        case 'get_ga_data':
        default:
          response = await this.analyticsData.properties.runReport({
            auth: this.auth,
            property: `properties/${propertyId}`,
            requestBody: {
              dateRanges: [{ startDate, endDate }],
              metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }],
              dimensions: [{ name: 'date' }]
            }
          });
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                dimensionHeaders: response.data.dimensionHeaders,
                metricHeaders: response.data.metricHeaders,
                rows: response.data.rows || [],
                rowCount: response.data.rowCount
              }, null, 2)
            }]
          };
      }
    } catch (error) {
      console.error(`GA Analytics tool error (${toolName}):`, error);
      return {
        content: [{
          type: 'text',
          text: `エラー: ${error.message}`
        }]
      };
    }
  }
}

const mcpClient = new GAAnalytics();

// Google OAuth認証用の設定（Netlify環境で強制的に正しいURLを使用）
let REDIRECT_URI;
if (process.env.NETLIFY || process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
  // 本番環境（Netlify/Vercel）では固定URL
  REDIRECT_URI = 'https://spectacular-caramel-1892fa.netlify.app/auth/callback';
} else {
  // 開発環境
  REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/callback';
}

console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.VERCEL,
  NETLIFY: process.env.NETLIFY,
  NETLIFY_DEV: process.env.NETLIFY_DEV,
  URL: process.env.URL,
  DEPLOY_URL: process.env.DEPLOY_URL,
  GOOGLE_REDIRECT_URI_ENV: process.env.GOOGLE_REDIRECT_URI,
  REDIRECT_URI_USED: REDIRECT_URI
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// 認証エンドポイント
app.get('/auth/google', (req, res) => {
  console.log('Auth request initiated');
  console.log('Redirect URI:', REDIRECT_URI);
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/analytics.readonly'],
    prompt: 'consent',
    redirect_uri: REDIRECT_URI // 明示的に指定
  });
  
  console.log('Generated auth URL:', authUrl);
  res.redirect(authUrl);
});

// デバッグ用：認証設定確認エンドポイント
app.get('/auth/debug', (req, res) => {
  res.json({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri_env: process.env.GOOGLE_REDIRECT_URI,
    redirect_uri_used: REDIRECT_URI,
    netlify_url: process.env.NETLIFY_URL,
    ga4_property_id: process.env.GA4_PROPERTY_ID,
    ga_view_id: process.env.GOOGLE_ANALYTICS_VIEW_ID,
    auth_url: oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/analytics.readonly'],
      redirect_uri: REDIRECT_URI
    })
  });
});

// トークンリフレッシュエンドポイント
app.post('/api/refresh-token', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // OAuth2クライアントでトークンをリフレッシュ
    const refreshClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );

    refreshClient.setCredentials({
      refresh_token: refresh_token
    });

    const newTokens = await refreshClient.refreshAccessToken();
    
    console.log('Token refresh successful');
    
    res.json({
      access_token: newTokens.credentials.access_token,
      expires_in: newTokens.credentials.expiry_date ? 
        Math.floor((newTokens.credentials.expiry_date - Date.now()) / 1000) : 3600
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ 
      error: 'Failed to refresh token',
      details: error.message 
    });
  }
});

// デバッグ用：GA4テストエンドポイント
app.post('/api/test-ga4', async (req, res) => {
  try {
    const { authTokens } = req.body;
    
    if (!authTokens) {
      return res.status(400).json({ error: 'Auth tokens required' });
    }

    // 認証設定
    const testAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );
    testAuth.setCredentials(authTokens);

    const analyticsData = google.analyticsdata('v1beta');
    const propertyId = process.env.GA4_PROPERTY_ID || '419224498';
    
    console.log(`Testing GA4 access with Property ID: ${propertyId}`);

    // シンプルなテストクエリ
    const response = await analyticsData.properties.runReport({
      auth: testAuth,
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }],
        dimensions: [{ name: 'date' }]
      }
    });

    res.json({
      success: true,
      propertyId: propertyId,
      rowCount: response.data.rowCount,
      hasData: response.data.rows ? response.data.rows.length > 0 : false,
      sampleData: response.data.rows ? response.data.rows.slice(0, 3) : null,
      metricHeaders: response.data.metricHeaders,
      dimensionHeaders: response.data.dimensionHeaders
    });

  } catch (error) {
    console.error('GA4 Test Error:', error);
    res.status(500).json({
      error: error.message,
      code: error.code,
      details: error.details || 'No additional details',
      propertyId: process.env.GA4_PROPERTY_ID || '419224498'
    });
  }
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }
    
    if (!code) {
      throw new Error('No authorization code received');
    }
    
    console.log('Received authorization code, exchanging for tokens...');
    
    const tokenResponse = await oauth2Client.getToken(code);
    console.log('Token response received:', !!tokenResponse);
    
    if (!tokenResponse.tokens) {
      throw new Error('No tokens received from Google');
    }
    
    // トークンをローカルストレージに保存してシンプルなリダイレクト
    const tokensJSON = JSON.stringify(tokenResponse.tokens);
    
    console.log('Authentication successful, saving tokens and redirecting');
    
    // 直接HTTPリダイレクトを使用（最も確実）
    const baseUrl = process.env.NETLIFY_URL || 'https://spectacular-caramel-1892fa.netlify.app';
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline'; object-src 'none';">
          <meta http-equiv="refresh" content="1;url=${baseUrl}/?auth_success=1">
        </head>
        <body>
          <h2>認証成功！</h2>
          <p>Google Analytics認証が完了しました。</p>
          <p>メインページに戻っています...</p>
          <p><a href="${baseUrl}/?auth_success=1">自動で戻らない場合はこちらをクリック</a></p>
          
          <script>
            (function() {
              console.log('Auth callback executing...');
              
              var tokens = ${tokensJSON};
              console.log('Tokens received:', !!tokens);
              
              // localStorageに保存
              try {
                localStorage.setItem('ga_auth_tokens_temp', JSON.stringify(tokens));
                console.log('Tokens saved to localStorage successfully');
              } catch (e) {
                console.error('Failed to save tokens:', e);
              }
              
              // postMessageで通知（可能な場合）
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage({
                    type: 'auth_success',
                    tokens: tokens
                  }, '${baseUrl}');
                  console.log('PostMessage sent to parent');
                  
                  // ポップアップウィンドウを閉じるだけ（親ウィンドウはリダイレクトしない）
                  setTimeout(function() {
                    window.close();
                  }, 500);
                  return; // 新しいウィンドウは開かない
                }
              } catch (e) {
                console.log('PostMessage failed, will redirect current window:', e);
              }
              
              // openerがない場合のみ現在のウィンドウをリダイレクト
              console.log('No opener found, redirecting current window');
              setTimeout(function() {
                window.location.href = '${baseUrl}/?auth_success=1';
              }, 1000);
              
            })();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Auth error:', error);
    res.send(`
      <html>
        <head>
          <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline'; object-src 'none';">
        </head>
        <body>
          <h2>認証エラー</h2>
          <p>エラー: ${error.message}</p>
          <p>このウィンドウは自動的に閉じられます。</p>
          <script>
            (function() {
              try {
                if (window.opener && typeof window.opener.postMessage === 'function') {
                  window.opener.postMessage({
                    type: 'auth_error',
                    error: '${error.message.replace(/'/g, "\\'")}'
                  }, '${process.env.NETLIFY_URL || 'https://spectacular-caramel-1892fa.netlify.app'}');
                }
                
                setTimeout(function() {
                  try {
                    window.close();
                  } catch (e) {
                    console.log('Could not close window automatically');
                  }
                }, 3000);
              } catch (e) {
                console.error('Error in auth error handler:', e);
              }
            })();
          </script>
        </body>
      </html>
    `);
  }
});

// API エンドポイント
app.post('/api/query', async (req, res) => {
  try {
    const { query, viewId, authTokens } = req.body;
    
    if (!query || !viewId) {
      return res.status(400).json({ error: 'クエリとビューIDが必要です' });
    }

    if (!authTokens) {
      return res.status(400).json({ error: 'Google認証が完了していません。🔑Google認証ボタンをクリックしてください。' });
    }

    console.log('AI分析開始...');
    const queryAnalysis = await aiAgent.processQuery(query, viewId);
    
    console.log('GA4データ取得開始...');
    const mcpResults = {};
    
    for (const action of queryAnalysis.suggestedActions) {
      try {
        console.log(`Calling GA tool: ${action.tool}`, action.params);
        
        const paramsWithAuth = {
          ...action.params,
          authTokens: authTokens
        };
        
        console.log('Auth tokens available:', !!authTokens);
        
        const result = await mcpClient.callTool(action.tool, paramsWithAuth);
        console.log(`GA tool result (${action.tool}):`, JSON.stringify(result, null, 2));
        mcpResults[action.tool] = result;
      } catch (error) {
        console.error(`GA tool error (${action.tool}):`, error);
        console.error('Error details:', error.stack);
        mcpResults[action.tool] = { error: error.message };
      }
    }

    console.log('レポート生成開始...');
    const report = await aiAgent.generateReport(query, mcpResults, queryAnalysis.aiAnalysis);
    
    res.json({
      success: true,
      analysis: queryAnalysis,
      data: mcpResults,
      report: report
    });

  } catch (error) {
    console.error('Query processing error:', error);
    res.status(500).json({ 
      error: 'クエリ処理中にエラーが発生しました',
      details: error.message 
    });
  }
});

// チャット専用APIエンドポイント
app.post('/api/chat/:sessionId', async (req, res) => {
  let timeoutId;
  
  try {
    const { sessionId } = req.params;
    const { message, viewId, authTokens } = req.body;
    
    // 29秒でタイムアウト（Netlifyの30秒制限ギリギリ）
    timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.log(`[チャット ${sessionId}] タイムアウト発生`);
        res.status(500).json({ 
          error: '処理時間が長すぎるためタイムアウトしました。もう一度お試しください。',
          timeout: true 
        });
      }
    }, 29000);
    
    if (!message || !viewId) {
      clearTimeout(timeoutId);
      return res.status(400).json({ error: 'メッセージとビューIDが必要です' });
    }

    if (!authTokens) {
      clearTimeout(timeoutId);
      return res.status(400).json({ error: 'Google認証が完了していません。🔑Google認証ボタンをクリックしてください。' });
    }

    const session = getOrCreateSession(sessionId);
    session.lastActivity = new Date();
    
    session.history.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    console.log(`[チャット ${sessionId}] 処理開始...`);
    
    // 直接的なキーワード分析で高速化
    const messageText = message.toLowerCase();
    let suggestedActions = [];
    
    if (messageText.includes('マーケティング') || messageText.includes('戦略') || messageText.includes('プラン')) {
      suggestedActions = [
        { tool: 'get_top_pages', params: { viewId, startDate: '30daysAgo', endDate: 'today', maxResults: 10 } },
        { tool: 'get_traffic_sources', params: { viewId, startDate: '30daysAgo', endDate: 'today' } }
      ];
    } else if (messageText.includes('人気') || messageText.includes('ページ')) {
      suggestedActions = [{ tool: 'get_top_pages', params: { viewId, startDate: '30daysAgo', endDate: 'today', maxResults: 10 } }];
    } else if (messageText.includes('トラフィック') || messageText.includes('流入')) {
      suggestedActions = [{ tool: 'get_traffic_sources', params: { viewId, startDate: '30daysAgo', endDate: 'today' } }];
    } else {
      suggestedActions = [{ tool: 'get_ga_data', params: { viewId, startDate: '30daysAgo', endDate: 'today', metrics: ['sessions', 'totalUsers', 'screenPageViews'], dimensions: ['date'] } }];
    }
    
    console.log(`[チャット ${sessionId}] GA4データ取得開始...`);
    const mcpResults = {};
    
    // 並列実行で処理時間短縮
    const toolPromises = suggestedActions.map(async (action) => {
      try {
        console.log(`Calling GA tool: ${action.tool}`, action.params);
        
        const paramsWithAuth = {
          ...action.params,
          authTokens: authTokens
        };
        
        const result = await Promise.race([
          mcpClient.callTool(action.tool, paramsWithAuth),
          new Promise((_, reject) => setTimeout(() => reject(new Error('GA API タイムアウト')), 15000))
        ]);
        
        console.log(`GA tool result (${action.tool}): 成功`);
        mcpResults[action.tool] = result;
      } catch (error) {
        console.error(`GA tool error (${action.tool}):`, error.message);
        mcpResults[action.tool] = { error: error.message };
      }
    });
    
    await Promise.allSettled(toolPromises);

    console.log(`[チャット ${sessionId}] レポート生成開始...`);
    const report = await Promise.race([
      aiAgent.generateReportWithHistory(message, mcpResults, '', session.history),
      new Promise((_, reject) => setTimeout(() => reject(new Error('レポート生成タイムアウト')), 12000))
    ]);
    
    session.history.push({
      role: 'assistant',
      content: report,
      timestamp: new Date(),
      data: mcpResults
    });

    clearTimeout(timeoutId);
    
    if (!res.headersSent) {
      res.json({
        success: true,
        sessionId: sessionId,
        response: report,
        data: mcpResults,
        conversationLength: session.history.length
      });
    }

  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Chat processing error (${req.params.sessionId}):`, error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message.includes('タイムアウト') 
          ? '処理時間が長すぎました。シンプルな質問で再度お試しください。' 
          : 'チャット処理中にエラーが発生しました',
        details: error.message,
        timeout: error.message.includes('タイムアウト')
      });
    }
  }
});

// チャット履歴取得エンドポイント
app.get('/api/chat/:sessionId/history', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = chatSessions.get(sessionId);
    
    if (!session) {
      return res.json({ 
        sessionId: sessionId,
        history: [],
        exists: false
      });
    }
    
    res.json({
      sessionId: sessionId,
      history: session.history.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      })),
      exists: true,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    });
  } catch (error) {
    console.error('History retrieval error:', error);
    res.status(500).json({ 
      error: '履歴取得中にエラーが発生しました',
      details: error.message 
    });
  }
});

// セッション削除エンドポイント
app.delete('/api/chat/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = chatSessions.delete(sessionId);
    
    res.json({
      success: deleted,
      message: deleted ? 'セッションが削除されました' : 'セッションが見つかりません'
    });
  } catch (error) {
    console.error('Session deletion error:', error);
    res.status(500).json({ 
      error: 'セッション削除中にエラーが発生しました',
      details: error.message 
    });
  }
});

// MCPツールの直接呼び出しエンドポイント
app.post('/api/mcp/:tool', async (req, res) => {
  try {
    const { tool } = req.params;
    const params = req.body;

    const result = await mcpClient.callTool(tool, params);
    res.json(result);

  } catch (error) {
    console.error(`MCP tool error (${tool}):`, error);
    res.status(500).json({ 
      error: 'MCPツール呼び出しエラー',
      details: error.message 
    });
  }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasGoogleCredentials: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    }
  });
});

// SPA用のフォールバック（Netlifyでは不要）
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../../public/index.html'));
// });

module.exports.handler = serverless(app);