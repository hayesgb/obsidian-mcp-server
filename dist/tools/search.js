import { z } from 'zod';
import { VaultService } from '../services/vault.js';
import { DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT } from '../constants.js';
export function registerSearchTools(server) {
    server.registerTool('obsidian_search', {
        description: 'Full-text search across all note content and frontmatter. Case-insensitive. Multi-word queries require all words to appear in the note.',
        inputSchema: z.object({
            query: z.string().min(1).describe('Search query. Multi-word queries require all words to appear in the note.'),
            limit: z.number().int().min(1).max(MAX_SEARCH_LIMIT).default(DEFAULT_SEARCH_LIMIT).describe('Maximum results to return (default 20, max 50)'),
            offset: z.number().int().min(0).default(0).describe('Number of results to skip for pagination'),
        }),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
        },
    }, async ({ query, limit, offset }) => {
        const vault = VaultService.getInstance();
        const results = await vault.searchNotes(query, limit, offset);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(results, null, 2),
                },
            ],
        };
    });
    server.registerTool('obsidian_search_by_tag', {
        description: 'Returns all notes matching a given tag. The tag can be provided with or without the # prefix.',
        inputSchema: z.object({
            tag: z.string().min(1).describe('Tag to search for (with or without # prefix, e.g. "project" or "#project")'),
            limit: z.number().int().min(1).max(MAX_SEARCH_LIMIT).default(DEFAULT_SEARCH_LIMIT).describe('Maximum results to return (default 20)'),
            offset: z.number().int().min(0).default(0).describe('Number of results to skip for pagination'),
        }),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
        },
    }, async ({ tag, limit, offset }) => {
        const vault = VaultService.getInstance();
        const results = await vault.searchByTag(tag, limit, offset);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(results, null, 2),
                },
            ],
        };
    });
}
