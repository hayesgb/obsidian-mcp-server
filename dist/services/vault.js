import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { SNIPPET_LENGTH } from '../constants.js';
export class VaultService {
    static instance;
    vaultRoot;
    constructor(vaultRoot) {
        this.vaultRoot = path.resolve(vaultRoot);
    }
    static getInstance(vaultRoot) {
        if (!VaultService.instance) {
            if (!vaultRoot)
                throw new Error('VaultService not initialized');
            VaultService.instance = new VaultService(vaultRoot);
        }
        return VaultService.instance;
    }
    resolveSafe(relativePath) {
        if (relativePath.includes('..')) {
            throw new Error(`Invalid path: directory traversal not allowed`);
        }
        const resolved = path.resolve(this.vaultRoot, relativePath);
        if (!resolved.startsWith(this.vaultRoot + path.sep) && resolved !== this.vaultRoot) {
            throw new Error(`Invalid path: must be within vault root`);
        }
        return resolved;
    }
    parseTags(content, frontmatter) {
        const tags = new Set();
        // Parse frontmatter tags
        const fmTags = frontmatter['tags'];
        if (Array.isArray(fmTags)) {
            for (const t of fmTags) {
                if (typeof t === 'string')
                    tags.add(t.replace(/^#/, ''));
            }
        }
        else if (typeof fmTags === 'string') {
            tags.add(fmTags.replace(/^#/, ''));
        }
        // Parse inline #tags (word characters after #, not preceded by [ or another #)
        const inlineTagRegex = /(?<![[\w#])#([\w/-]+)/g;
        let match;
        while ((match = inlineTagRegex.exec(content)) !== null) {
            if (match[1])
                tags.add(match[1]);
        }
        return Array.from(tags);
    }
    async walkDir(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = [];
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                // Skip hidden directories
                if (!entry.name.startsWith('.')) {
                    const nested = await this.walkDir(fullPath);
                    files.push(...nested);
                }
            }
            else if (entry.isFile() && entry.name.endsWith('.md')) {
                files.push(fullPath);
            }
        }
        return files;
    }
    async listNotes(folder) {
        const searchRoot = folder ? this.resolveSafe(folder) : this.vaultRoot;
        const allFiles = await this.walkDir(searchRoot);
        return allFiles.map((f) => path.relative(this.vaultRoot, f));
    }
    async listFolders() {
        const folders = [];
        const walk = async (dir) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    const fullPath = path.join(dir, entry.name);
                    folders.push(path.relative(this.vaultRoot, fullPath));
                    await walk(fullPath);
                }
            }
        };
        await walk(this.vaultRoot);
        return folders.sort();
    }
    async listTags() {
        const tagMap = new Map();
        const files = await this.walkDir(this.vaultRoot);
        for (const file of files) {
            try {
                const raw = await fs.readFile(file, 'utf-8');
                const parsed = matter(raw);
                const tags = this.parseTags(parsed.content, parsed.data);
                for (const tag of tags) {
                    tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
                }
            }
            catch {
                // Skip unreadable files
            }
        }
        return Array.from(tagMap.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }
    async readNote(relativePath) {
        const fullPath = this.resolveSafe(relativePath);
        const [raw, stat] = await Promise.all([
            fs.readFile(fullPath, 'utf-8'),
            fs.stat(fullPath),
        ]);
        const parsed = matter(raw);
        const frontmatter = parsed.data;
        const tags = this.parseTags(parsed.content, frontmatter);
        return {
            path: relativePath,
            title: path.basename(relativePath, '.md'),
            frontmatter,
            body: parsed.content,
            tags,
            size: stat.size,
            modified: stat.mtime.toISOString(),
            created: stat.birthtime.toISOString(),
        };
    }
    async searchNotes(query, limit, offset) {
        const files = await this.walkDir(this.vaultRoot);
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        const hits = [];
        for (const file of files) {
            try {
                const raw = await fs.readFile(file, 'utf-8');
                const lower = raw.toLowerCase();
                const allMatch = words.every((w) => lower.includes(w));
                if (!allMatch)
                    continue;
                const parsed = matter(raw);
                const frontmatter = parsed.data;
                const tags = this.parseTags(parsed.content, frontmatter);
                const stat = await fs.stat(file);
                const firstWord = words[0] ?? '';
                const idx = lower.indexOf(firstWord);
                const start = Math.max(0, idx - 50);
                const snippet = raw.substring(start, start + SNIPPET_LENGTH).replace(/\n/g, ' ');
                hits.push({
                    path: path.relative(this.vaultRoot, file),
                    title: path.basename(file, '.md'),
                    snippet,
                    tags,
                    modified: stat.mtime.toISOString(),
                });
            }
            catch {
                // Skip unreadable files
            }
        }
        const total = hits.length;
        const page = hits.slice(offset, offset + limit);
        const hasMore = offset + limit < total;
        return {
            total,
            count: page.length,
            offset,
            has_more: hasMore,
            ...(hasMore ? { next_offset: offset + limit } : {}),
            notes: page,
        };
    }
    async searchByTag(tag, limit, offset) {
        const normalizedTag = tag.replace(/^#/, '').toLowerCase();
        const files = await this.walkDir(this.vaultRoot);
        const hits = [];
        for (const file of files) {
            try {
                const raw = await fs.readFile(file, 'utf-8');
                const parsed = matter(raw);
                const frontmatter = parsed.data;
                const tags = this.parseTags(parsed.content, frontmatter);
                if (!tags.map((t) => t.toLowerCase()).includes(normalizedTag))
                    continue;
                const stat = await fs.stat(file);
                const snippet = parsed.content.substring(0, SNIPPET_LENGTH).replace(/\n/g, ' ');
                hits.push({
                    path: path.relative(this.vaultRoot, file),
                    title: path.basename(file, '.md'),
                    snippet,
                    tags,
                    modified: stat.mtime.toISOString(),
                });
            }
            catch {
                // Skip unreadable files
            }
        }
        const total = hits.length;
        const page = hits.slice(offset, offset + limit);
        const hasMore = offset + limit < total;
        return {
            total,
            count: page.length,
            offset,
            has_more: hasMore,
            ...(hasMore ? { next_offset: offset + limit } : {}),
            notes: page,
        };
    }
    async createNote(relativePath, content, overwrite) {
        const fullPath = this.resolveSafe(relativePath);
        if (!overwrite) {
            try {
                await fs.access(fullPath);
                throw new Error(`Note already exists: ${relativePath}. Set overwrite=true to replace it.`);
            }
            catch (err) {
                if (err instanceof Error && err.message.includes('already exists'))
                    throw err;
                // File doesn't exist — proceed
            }
        }
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
        const stat = await fs.stat(fullPath);
        return { path: relativePath, action: 'created', size: stat.size };
    }
    async updateNote(relativePath, content) {
        const fullPath = this.resolveSafe(relativePath);
        try {
            await fs.access(fullPath);
        }
        catch {
            throw new Error(`Note not found: ${relativePath}`);
        }
        await fs.writeFile(fullPath, content, 'utf-8');
        const stat = await fs.stat(fullPath);
        return { path: relativePath, action: 'updated', size: stat.size };
    }
    async appendToNote(relativePath, content) {
        const fullPath = this.resolveSafe(relativePath);
        try {
            await fs.access(fullPath);
        }
        catch {
            throw new Error(`Note not found: ${relativePath}`);
        }
        const existing = await fs.readFile(fullPath, 'utf-8');
        const separator = existing.endsWith('\n') ? '' : '\n';
        await fs.writeFile(fullPath, existing + separator + content, 'utf-8');
        const stat = await fs.stat(fullPath);
        return { path: relativePath, action: 'appended', size: stat.size };
    }
}
