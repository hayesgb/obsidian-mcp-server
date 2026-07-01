# obsidian-mcp-server

An MCP (Model Context Protocol) server that exposes a local Obsidian vault over HTTP or stdio. Designed to run on a Mac mini and be accessed remotely from Claude.ai via Tailscale, or locally by OpenClaw agents via stdio.

## What This Does

Exposes 9 MCP tools for reading, searching, and writing notes in your Obsidian vault:

- `obsidian_list_notes` — paginated list of all notes, optionally filtered by folder
- `obsidian_list_folders` — all folders in the vault
- `obsidian_list_tags` — all tags with note counts
- `obsidian_read_note` — read a note with frontmatter, body, tags, and metadata
- `obsidian_search` — full-text search across all notes
- `obsidian_search_by_tag` — find all notes with a given tag
- `obsidian_create_note` — create a new note (with optional overwrite)
- `obsidian_update_note` — replace the full content of a note
- `obsidian_append_to_note` — append text to the bottom of a note

## Prerequisites

- Node.js 20+
- An Obsidian vault on disk

## Installation

```bash
cd ~/projects/obsidian-mcp-server
npm install
npm run build
cp .env.example .env
# Edit .env and set VAULT_PATH to your vault directory
```

## Running Manually

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Test that it's running:

```bash
curl http://localhost:3333/health
# {"status":"ok","vault":"/path/to/your/vault"}
```

## Installing as a launchd Service (macOS)

This runs the server automatically at login and restarts it if it crashes.

```bash
# 1. Edit the plist to set your actual vault path
nano com.greg.obsidian-mcp-server.plist
# Change REPLACE_WITH_YOUR_VAULT_PATH to your actual vault path

# 2. Also verify the node path is correct for your system
which node  # use this path in ProgramArguments if different from /usr/local/bin/node

# 3. Install and load the service
cp com.greg.obsidian-mcp-server.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.greg.obsidian-mcp-server.plist

# 4. Check it's running
curl http://localhost:3333/health

# View logs
tail -f ~/Library/Logs/obsidian-mcp-server.log
```

## Connecting from Claude.ai (via Tailscale)

In Claude.ai settings, add a new MCP server with this URL:

```
http://<your-macmini-tailscale-hostname>:3333/mcp
```

Replace `<your-macmini-tailscale-hostname>` with your Mac mini's Tailscale hostname or IP (e.g. `macmini.tail1234.ts.net` or `100.x.x.x`).

The server binds to `127.0.0.1` — Tailscale handles routing external requests to localhost.

## Connecting OpenClaw Agents (stdio mode)

Add this to your OpenClaw agent tool configuration:

```json
{
  "type": "mcp",
  "transport": "stdio",
  "command": "node",
  "args": ["/Users/greg/projects/obsidian-mcp-server/dist/index.js"],
  "env": {
    "VAULT_PATH": "/path/to/your/vault",
    "TRANSPORT": "stdio"
  }
}
```

## Uninstalling the Service

```bash
launchctl unload ~/Library/LaunchAgents/com.greg.obsidian-mcp-server.plist
rm ~/Library/LaunchAgents/com.greg.obsidian-mcp-server.plist
```
