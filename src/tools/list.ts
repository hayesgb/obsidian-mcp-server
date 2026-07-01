import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VaultService } from '../services/vault.js';
import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from '../constants.js';

export function registerListTools(server: McpServer): void {
  server.registerTool(
    'obsidian_list_notes',
    {
      description: 'Lists all markdown notes in the vault, optionally filtered to a subfolder. Returns a paginated list of note paths with modified dates.',
      inputSchema: z.object({
        folder: z.string().optional().describe('Optional subfolder to list notes from (vault-relative path)'),
        limit: z.number().int().min(1).max(MAX_LIST_LIMIT).default(DEFAULT_LIST_LIMIT).describe('Maximum number of notes to return (default 50, max 200)'),
        offset: z.number().int().min(0).default(0).describe('Number of notes to skip for pagination'),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    async ({ folder, limit, offset }) => {
      const vault = VaultService.getInstance();
      const allNotes = await vault.listNotes(folder);
      const total = allNotes.length;
      const page = allNotes.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      // Get modified dates for the page
      const notesWithDates = await Promise.all(
        page.map(async (notePath) => {
          try {
            const note = await vault.readNote(notePath);
            return { path: notePath, modified: note.modified };
          } catch {
            return { path: notePath, modified: '' };
          }
        })
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              total,
              count: page.length,
              offset,
              has_more: hasMore,
              ...(hasMore ? { next_offset: offset + limit } : {}),
              notes: notesWithDates,
            }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    'obsidian_list_folders',
    {
      description: 'Lists all folders in the vault.',
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    async () => {
      const vault = VaultService.getInstance();
      const folders = await vault.listFolders();
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ folders, count: folders.length }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    'obsidian_list_tags',
    {
      description: 'Lists all unique tags across the entire vault with note counts, sorted by frequency descending.',
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    async () => {
      const vault = VaultService.getInstance();
      const tags = await vault.listTags();
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ tags, count: tags.length }, null, 2),
          },
        ],
      };
    }
  );
}
