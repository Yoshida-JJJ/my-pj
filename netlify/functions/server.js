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

// Google OAuth認証用の設定
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 認証エンドポイント
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/analytics.readonly'],
    prompt: 'consent'
  });
  res.redirect(authUrl);
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
    
    // トークンをクライアント側に送信（複数の方法を併用）
    const tokensJSON = JSON.stringify(tokenResponse.tokens);
    const tokensBase64 = Buffer.from(tokensJSON).toString('base64');
    
    console.log('Authentication successful, sending tokens to client');
    
    // Method A: 直接リダイレクトでトークンを渡す（最も確実）
    const redirectUrl = `${process.env.NETLIFY_URL || 'https://spectacular-caramel-1892fa.netlify.app'}/chat.html?auth_tokens=${encodeURIComponent(tokensBase64)}&auth_success=1`;
    
    res.send(`
      <html>
        <head>
          <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline'; object-src 'none';">
        </head>
        <body>
          <h2>認証成功！</h2>
          <p>Google Analytics認証が完了しました。</p>
          <p>メインページにリダイレクトしています...</p>
          
          <script>
            (function() {
              try {
                console.log('Auth callback script starting...');
                
                var tokens = ${tokensJSON};
                console.log('Tokens prepared:', !!tokens);
                
                // Method 1: localStorage（確実な方法）
                try {
                  localStorage.setItem('ga_auth_tokens_temp', JSON.stringify(tokens));
                  console.log('Tokens saved to localStorage');
                } catch (e) {
                  console.error('localStorage failed:', e);
                }
                
                // Method 2: postMessage（可能な場合）
                if (window.opener && typeof window.opener.postMessage === 'function') {
                  try {
                    window.opener.postMessage({
                      type: 'auth_success',
                      tokens: tokens
                    }, '*');
                    console.log('Tokens sent via postMessage');
                  } catch (e) {
                    console.error('postMessage failed:', e);
                  }
                }
                
                // Method 3: 親ウィンドウを直接リダイレクト
                if (window.opener) {
                  try {
                    window.opener.location.href = '${redirectUrl}';
                    console.log('Parent redirected');
                  } catch (e) {
                    console.error('Redirect failed:', e);
                  }
                }
                
                // 自動クローズ
                setTimeout(function() {
                  try {
                    window.close();
                  } catch (e) {
                    // 閉じられない場合は手動リダイレクト
                    window.location.href = '${redirectUrl}';
                  }
                }, 2000);
                
              } catch (error) {
                console.error('Auth callback error:', error);
                // エラーでも安全な場所にリダイレクト
                window.location.href = '${redirectUrl}';
              }
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
  try {
    const { sessionId } = req.params;
    const { message, viewId, authTokens } = req.body;
    
    if (!message || !viewId) {
      return res.status(400).json({ error: 'メッセージとビューIDが必要です' });
    }

    if (!authTokens) {
      return res.status(400).json({ error: 'Google認証が完了していません。🔑Google認証ボタンをクリックしてください。' });
    }

    const session = getOrCreateSession(sessionId);
    session.lastActivity = new Date();
    
    session.history.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    console.log(`[チャット ${sessionId}] AI分析開始...`);
    const queryAnalysis = await aiAgent.processQueryWithHistory(message, viewId, session.history);
    
    console.log(`[チャット ${sessionId}] GA4データ取得開始...`);
    const mcpResults = {};
    
    for (const action of queryAnalysis.suggestedActions) {
      try {
        console.log(`Calling GA tool: ${action.tool}`, action.params);
        
        const paramsWithAuth = {
          ...action.params,
          authTokens: authTokens
        };
        
        const result = await mcpClient.callTool(action.tool, paramsWithAuth);
        console.log(`GA tool result (${action.tool}):`, JSON.stringify(result, null, 2));
        mcpResults[action.tool] = result;
      } catch (error) {
        console.error(`GA tool error (${action.tool}):`, error);
        mcpResults[action.tool] = { error: error.message };
      }
    }

    console.log(`[チャット ${sessionId}] レポート生成開始...`);
    const report = await aiAgent.generateReportWithHistory(message, mcpResults, queryAnalysis.aiAnalysis, session.history);
    
    session.history.push({
      role: 'assistant',
      content: report,
      timestamp: new Date(),
      data: mcpResults
    });

    res.json({
      success: true,
      sessionId: sessionId,
      response: report,
      analysis: queryAnalysis,
      data: mcpResults,
      conversationLength: session.history.length
    });

  } catch (error) {
    console.error(`Chat processing error (${sessionId}):`, error);
    res.status(500).json({ 
      error: 'チャット処理中にエラーが発生しました',
      details: error.message 
    });
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