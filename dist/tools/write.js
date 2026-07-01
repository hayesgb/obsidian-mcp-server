import { z } from 'zod';
import { VaultService } from '../services/vault.js';
export function registerWriteTools(server) {
    server.registerTool('obsidian_create_note', {
        description: 'Creates a new markdown note in the vault. Automatically creates intermediate directories. Fails with a clear error if the file already exists and overwrite is false.',
        inputSchema: z.object({
            path: z.string().min(1).describe('Vault-relative path for the new note (e.g. "projects/MyNote.md")'),
            content: z.string().describe('Full markdown content of the note'),
            overwrite: z.boolean().default(false).describe('If true, overwrite existing note. Default false.'),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
        },
    }, async ({ path, content, overwrite }) => {
        const vault = VaultService.getInstance();
        const result = await vault.createNote(path, content, overwrite);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    });
    server.registerTool('obsidian_update_note', {
        description: 'Replaces the full content of an existing note. Fails with a clear error if the note does not exist.',
        inputSchema: z.object({
            path: z.string().min(1).describe('Vault-relative path to the note to update'),
            content: z.string().describe('New full markdown content to replace the note with'),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: true,
            idempotentHint: true,
        },
    }, async ({ path, content }) => {
        const vault = VaultService.getInstance();
        const result = await vault.updateNote(path, content);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    });
    server.registerTool('obsidian_append_to_note', {
        description: 'Appends text to the bottom of an existing note. Adds a newline separator before the appended content if the note does not end with a newline. Fails if the note does not exist.',
        inputSchema: z.object({
            path: z.string().min(1).describe('Vault-relative path to the note to append to'),
            content: z.string().describe('Text to append to the bottom of the note'),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
        },
    }, async ({ path, content }) => {
        const vault = VaultService.getInstance();
        const result = await vault.appendToNote(path, content);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    });
}
