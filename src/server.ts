import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListTools } from './tools/list.js';
import { registerReadTools } from './tools/read.js';
import { registerSearchTools } from './tools/search.js';
import { registerWriteTools } from './tools/write.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'obsidian-mcp-server',
    version: '1.0.0',
  });

  registerListTools(server);
  registerReadTools(server);
  registerSearchTools(server);
  registerWriteTools(server);

  return server;
}
