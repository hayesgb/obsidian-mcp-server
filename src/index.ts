import 'dotenv/config';
import fs from 'fs/promises';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { VaultService } from './services/vault.js';
import { createServer } from './server.js';
import { DEFAULT_PORT, MCP_PATH, HEALTH_PATH } from './constants.js';

async function main(): Promise<void> {
  const vaultPath = process.env['VAULT_PATH'];
  if (!vaultPath) {
    process.stderr.write('Error: VAULT_PATH environment variable is required\n');
    process.exit(1);
  }

  try {
    const stat = await fs.stat(vaultPath);
    if (!stat.isDirectory()) {
      process.stderr.write(`Error: VAULT_PATH is not a directory: ${vaultPath}\n`);
      process.exit(1);
    }
  } catch {
    process.stderr.write(`Error: VAULT_PATH directory not found: ${vaultPath}\n`);
    process.exit(1);
  }

  // Initialize VaultService singleton
  VaultService.getInstance(vaultPath);

  const transport = process.env['TRANSPORT'] ?? 'http';

  if (transport === 'stdio') {
    process.stderr.write(`[obsidian-mcp-server] Starting stdio transport\n`);
    process.stderr.write(`[obsidian-mcp-server] Vault: ${vaultPath}\n`);

    const server = createServer();
    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);
    process.stderr.write(`[obsidian-mcp-server] Ready\n`);
  } else {
    const port = parseInt(process.env['PORT'] ?? String(DEFAULT_PORT), 10);

    process.stderr.write(`[obsidian-mcp-server] Starting HTTP transport on port ${port}\n`);
    process.stderr.write(`[obsidian-mcp-server] Vault: ${vaultPath}\n`);

    const app = express();
    app.use(express.json());

    app.get(HEALTH_PATH, (_req, res) => {
      res.json({ status: 'ok', vault: vaultPath });
    });

    app.post(MCP_PATH, async (req, res) => {
      const server = createServer();
      const httpTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(httpTransport);
      await httpTransport.handleRequest(req, res, req.body);
    });

    app.listen(port, '127.0.0.1', () => {
      process.stderr.write(`[obsidian-mcp-server] Listening on http://127.0.0.1:${port}\n`);
      process.stderr.write(`[obsidian-mcp-server] MCP endpoint: http://127.0.0.1:${port}${MCP_PATH}\n`);
      process.stderr.write(`[obsidian-mcp-server] Health: http://127.0.0.1:${port}${HEALTH_PATH}\n`);
    });
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
