import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VaultService } from '../services/vault.js';

export function registerReadTools(server: McpServer): void {
  server.registerTool(
    'obsidian_read_note',
    {
      description: 'Reads a single note by its vault-relative path. Returns full note content including frontmatter, body, tags, and metadata.',
      inputSchema: z.object({
        path: z.string().describe('Vault-relative path to the note (e.g. "projects/OpenClaw.md")'),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    async ({ path }) => {
      const vault = VaultService.getInstance();
      const note = await vault.readNote(path);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(note, null, 2),
          },
        ],
      };
    }
  );
}
