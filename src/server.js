const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const AIAgent = require('./ai-agent');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Basic認証（本番環境のみ）
if (process.env.NODE_ENV === 'production') {
  const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || 'admin';
  const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || 'changeme123';
  
  app.use((req, res, next) => {
    const auth = req.headers.authorization;
    const expectedAuth = 'Basic ' + Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}`).toString('base64');
    
    if (!auth || auth !== expectedAuth) {
      res.set('WWW-Authenticate', 'Basic realm="GA Analytics Access"');
      return res.status(401).send('認証が必要です');
    }
    next();
  });
}

app.use(express.static(path.join(__dirname, '../public')));

const aiAgent = new AIAgent();

// チャット履歴管理
const chatSessions = new Map(); // セッションID -> 履歴の管理

// セッション作成/取得
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

// MCPサーバーとの通信クラス
class MCPClient {
  constructor() {
    this.mcpProcess = null;
  }

  async callTool(toolName, params) {
    return new Promise((resolve, reject) => {
      // Shopifyツールかどうかで使用するサーバーを決定
      const serverFile = toolName.startsWith('get_shopify_') ? 'shopify-mcp-server.js' : 'mcp-server.js';
      const mcpProcess = spawn('node', [path.join(__dirname, serverFile)], {
        stdio: 'pipe'
      });

      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params
        }
      };

      let responseData = '';
      let errorData = '';

      mcpProcess.stdout.on('data', (data) => {
        responseData += data.toString();
      });

      mcpProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      mcpProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const response = JSON.parse(responseData);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid JSON response from MCP server'));
          }
        } else {
          reject(new Error(`MCP server error: ${errorData}`));
        }
      });

      mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      mcpProcess.stdin.end();
    });
  }
}

const mcpClient = new MCPClient();

// Google OAuth認証用の設定
const { google } = require('googleapis');
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
    
    // コード交換でトークンを取得
    const tokenResponse = await oauth2Client.getToken(code);
    console.log('Token response received:', !!tokenResponse);
    
    if (!tokenResponse.tokens) {
      throw new Error('No tokens received from Google');
    }
    
    // 認証情報を設定
    oauth2Client.setCredentials(tokenResponse.tokens);
    global.authTokens = tokenResponse.tokens;
    
    console.log('Authentication successful, tokens saved');
    
    res.send(`
      <html>
        <body>
          <h2>認証成功！</h2>
          <p>Google Analytics認証が完了しました。</p>
          <p>このウィンドウは自動的に閉じられます。</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Auth error:', error);
    res.send(`
      <html>
        <body>
          <h2>認証エラー</h2>
          <p>エラー: ${error.message}</p>
          <p>このウィンドウは自動的に閉じられます。</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  }
});

// API エンドポイント
app.post('/api/query', async (req, res) => {
  try {
    const { query, viewId } = req.body;
    
    if (!query || !viewId) {
      return res.status(400).json({ error: 'クエリとビューIDが必要です' });
    }

    // Step 1: AI による質問解析
    console.log('AI分析開始...');
    const queryAnalysis = await aiAgent.processQuery(query, viewId);
    
    // Step 2: 必要なデータをMCPから取得
    console.log('MCPデータ取得開始...');
    const mcpResults = {};
    
    for (const action of queryAnalysis.suggestedActions) {
      try {
        console.log(`Calling MCP tool: ${action.tool}`, action.params);
        
        // 認証トークンをパラメータに追加
        if (!global.authTokens) {
          throw new Error('Google認証が完了していません。🔑Google認証ボタンをクリックしてください。');
        }
        
        const paramsWithAuth = {
          ...action.params,
          authTokens: global.authTokens
        };
        
        console.log('Auth tokens available:', !!global.authTokens);
        
        const result = await mcpClient.callTool(action.tool, paramsWithAuth);
        console.log(`MCP tool result (${action.tool}):`, JSON.stringify(result, null, 2));
        mcpResults[action.tool] = result;
      } catch (error) {
        console.error(`MCP tool error (${action.tool}):`, error);
        console.error('Error details:', error.stack);
        mcpResults[action.tool] = { error: error.message };
      }
    }

    // Step 3: レポート生成
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

// 質問の意図解析エンドポイント
app.post('/api/interpret', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'クエリが必要です' });
    }

    const interpretation = await aiAgent.interpretQuery(query);
    res.json(interpretation);

  } catch (error) {
    console.error('Interpretation error:', error);
    res.status(500).json({ 
      error: '質問解析中にエラーが発生しました',
      details: error.message 
    });
  }
});

// チャット専用APIエンドポイント
app.post('/api/chat/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, viewId } = req.body;
    
    if (!message || !viewId) {
      return res.status(400).json({ error: 'メッセージとビューIDが必要です' });
    }

    // セッション取得
    const session = getOrCreateSession(sessionId);
    session.lastActivity = new Date();
    
    // ユーザーメッセージを履歴に追加
    session.history.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Step 1: AI による質問解析（会話履歴を含む）
    console.log(`[チャット ${sessionId}] AI分析開始...`);
    const queryAnalysis = await aiAgent.processQueryWithHistory(message, viewId, session.history);
    
    // Step 2: 必要なデータをMCPから取得
    console.log(`[チャット ${sessionId}] MCPデータ取得開始...`);
    const mcpResults = {};
    
    for (const action of queryAnalysis.suggestedActions) {
      try {
        console.log(`Calling MCP tool: ${action.tool}`, action.params);
        
        // 認証トークンをパラメータに追加
        if (!global.authTokens) {
          throw new Error('Google認証が完了していません。🔑Google認証ボタンをクリックしてください。');
        }
        
        const paramsWithAuth = {
          ...action.params,
          authTokens: global.authTokens
        };
        
        const result = await mcpClient.callTool(action.tool, paramsWithAuth);
        console.log(`MCP tool result (${action.tool}):`, JSON.stringify(result, null, 2));
        mcpResults[action.tool] = result;
      } catch (error) {
        console.error(`MCP tool error (${action.tool}):`, error);
        mcpResults[action.tool] = { error: error.message };
      }
    }

    // Step 3: レポート生成（会話履歴を考慮）
    console.log(`[チャット ${sessionId}] レポート生成開始...`);
    const report = await aiAgent.generateReportWithHistory(message, mcpResults, queryAnalysis.aiAnalysis, session.history);
    
    // AIレスポンスを履歴に追加
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
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasGoogleCredentials: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    }
  });
});

// SPA用のフォールバック
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 GA MCP Agent サーバーが http://0.0.0.0:${port} で起動しました`);
  console.log('環境変数チェック:');
  console.log(`- ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗'}`);
  console.log(`- GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✓' : '✗'}`);
  console.log(`- GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✓' : '✗'}`);
  console.log(`- GA4_PROPERTY_ID: ${process.env.GA4_PROPERTY_ID ? '✓' : '✗'}`);
});