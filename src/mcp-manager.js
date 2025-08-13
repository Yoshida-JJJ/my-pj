const { spawn } = require('child_process');
const path = require('path');

class MCPManager {
  constructor() {
    this.servers = new Map();
    this.serverConfigs = {
      // 我々のカスタムShopify売上分析サーバー
      shopify_analytics: {
        command: 'node',
        args: [path.join(__dirname, 'shopify-mcp-server.js')],
        env: process.env
      },
      // Shopify公式開発者向けサーバー
      shopify_dev: {
        command: 'npx',
        args: ['-y', '@shopify/dev-mcp@latest'],
        env: process.env
      }
    };
  }

  async startServer(serverName) {
    if (this.servers.has(serverName)) {
      return this.servers.get(serverName);
    }

    const config = this.serverConfigs[serverName];
    if (!config) {
      throw new Error(`Unknown MCP server: ${serverName}`);
    }

    console.log(`Starting MCP server: ${serverName}`);
    
    const server = spawn(config.command, config.args, {
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const serverInstance = {
      process: server,
      name: serverName,
      initialized: false,
      tools: []
    };

    // 初期化処理
    return new Promise((resolve, reject) => {
      let buffer = '';
      
      server.stdout.on('data', (data) => {
        buffer += data.toString();
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              
              if (response.type === 'initialization') {
                console.log(`MCP server ${serverName} initialized`);
                serverInstance.initialized = true;
                this.loadToolsList(serverInstance).then(() => {
                  resolve(serverInstance);
                });
              }
            } catch (error) {
              console.error(`Failed to parse MCP response from ${serverName}:`, error);
            }
          }
        }
      });

      server.stderr.on('data', (data) => {
        console.error(`MCP server ${serverName} error:`, data.toString());
      });

      server.on('error', (error) => {
        console.error(`Failed to start MCP server ${serverName}:`, error);
        reject(error);
      });

      server.on('exit', (code) => {
        console.log(`MCP server ${serverName} exited with code ${code}`);
        this.servers.delete(serverName);
      });
    }).then((serverInstance) => {
      this.servers.set(serverName, serverInstance);
      return serverInstance;
    });
  }

  async loadToolsList(serverInstance) {
    try {
      const request = {
        method: 'tools/list',
        params: {}
      };

      const response = await this.sendRequest(serverInstance, request);
      serverInstance.tools = response.tools || [];
      console.log(`Loaded ${serverInstance.tools.length} tools from ${serverInstance.name}`);
    } catch (error) {
      console.error(`Failed to load tools from ${serverInstance.name}:`, error);
    }
  }

  async sendRequest(serverInstance, request) {
    return new Promise((resolve, reject) => {
      if (!serverInstance.initialized) {
        reject(new Error(`MCP server ${serverInstance.name} not initialized`));
        return;
      }

      // リクエストIDを生成してリクエストを識別
      const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const requestWithId = { ...request, id: requestId };

      let buffer = '';
      
      const onData = (data) => {
        buffer += data.toString();
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              
              // レスポンスのIDをチェック（複数リクエスト対応）
              if (response.id === requestId || !response.id) {
                serverInstance.process.stdout.removeListener('data', onData);
                
                if (response.error) {
                  reject(new Error(response.error.message));
                } else {
                  resolve(response);
                }
              }
            } catch (error) {
              serverInstance.process.stdout.removeListener('data', onData);
              reject(error);
            }
          }
        }
      };

      serverInstance.process.stdout.on('data', onData);
      
      // タイムアウト設定
      const timeoutId = setTimeout(() => {
        serverInstance.process.stdout.removeListener('data', onData);
        reject(new Error(`Request timeout for MCP server ${serverInstance.name} (ID: ${requestId})`));
      }, 15000); // タイムアウトを15秒に延長

      // リクエスト送信
      try {
        serverInstance.process.stdin.write(JSON.stringify(requestWithId) + '\n');
      } catch (error) {
        clearTimeout(timeoutId);
        serverInstance.process.stdout.removeListener('data', onData);
        reject(new Error(`Failed to send request: ${error.message}`));
      }
    });
  }

  async callTool(toolName, params, sessionId = 'default') {
    // どのサーバーがこのツールを持っているかを検索
    for (const [serverName, server] of this.servers) {
      if (server.tools.some(tool => tool.name === toolName)) {
        const request = {
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: params
          }
        };

        try {
          console.log(`[セッション ${sessionId}] Calling tool ${toolName} on MCP server ${serverName}`);
          const result = await this.sendRequest(server, request);
          console.log(`[セッション ${sessionId}] Tool ${toolName} completed successfully`);
          return result;
        } catch (error) {
          console.error(`[セッション ${sessionId}] Tool call failed on ${serverName}:`, error);
          throw error;
        }
      }
    }

    throw new Error(`Tool ${toolName} not found in any MCP server`);
  }

  async getAvailableTools() {
    const allTools = [];
    
    for (const [serverName, server] of this.servers) {
      for (const tool of server.tools) {
        allTools.push({
          ...tool,
          server: serverName
        });
      }
    }
    
    return allTools;
  }

  async initializeShopifyServer() {
    try {
      await this.startServer('shopify');
      console.log('Shopify MCP server ready');
    } catch (error) {
      console.error('Failed to initialize Shopify MCP server:', error);
      throw error;
    }
  }

  async shutdown() {
    console.log('Shutting down MCP servers...');
    
    for (const [serverName, server] of this.servers) {
      try {
        server.process.kill('SIGTERM');
        console.log(`Stopped MCP server: ${serverName}`);
      } catch (error) {
        console.error(`Error stopping MCP server ${serverName}:`, error);
      }
    }
    
    this.servers.clear();
  }
}

module.exports = MCPManager;