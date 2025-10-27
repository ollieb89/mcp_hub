# MCP Hub - Server Implementation Guide

This document provides an overview of all MCP servers configured in this MCP Hub instance, their capabilities, and how to use them.

## Table of Contents

1. [Overview](#overview)
2. [Configured Servers](#configured-servers)
3. [Server Categories](#server-categories)
4. [Usage](#usage)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

## Overview

MCP Hub is running on **port 7000** and provides unified access to multiple MCP servers through a single endpoint: `http://localhost:7000/mcp`

### Current Status

- **Total Servers Configured**: 11
- **Active Servers**: 9
- **Total Tools Available**: 116+
- **Hub Endpoint**: `http://localhost:7000/mcp`

## Configured Servers

### 1. Serena MCP Server ✅

**Purpose**: Intelligent code analysis and project management  
**Tools**: 27

**Capabilities**:
- Code reading, writing, and editing
- File system operations
- Symbol-based code navigation
- Memory management (session persistence)
- Project activation and mode switching
- Shell command execution

**Configuration**: Local installation using `uv`  
**Location**: `/home/ob/Development/Tools/mcps/serena`

**Use Cases**:
- Code exploration and navigation
- Automated code modifications
- Project context management
- Session memory management

---

### 2. Shadcn UI MCP Server ✅

**Purpose**: Shadcn UI component discovery and installation  
**Tools**: 7

**Capabilities**:
- Browse shadcn/ui components
- Install components directly to your project
- Search components by name or description
- Get component source code
- Framework-specific component variants (React, Vue, Svelte)

**Configuration**:
- Uses GitHub Personal Access Token for API access
- Framework: React (default)

**Environment Variables**:
```bash
GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_TOKEN}
```

**Use Cases**:
- Component discovery for UI development
- Quick component installation
- Copying component patterns
- Framework migration

---

### 3. Gemini MCP Server ✅

**Purpose**: Google Gemini AI integration  
**Tools**: 6

**Capabilities**:
- AI-powered content generation
- Image analysis and description
- Text completion and refinement
- Multimodal AI interactions
- Code generation and review

**Configuration**:
- API Provider: Gemini API
- Requires: Google API Key

**Environment Variables**:
```bash
GOOGLE_API_KEY=${GEMINI_API_KEY}
```

**Use Cases**:
- AI-powered content generation
- Code explanations and documentation
- Image understanding and analysis
- Creative content generation

---

### 4. Docker Hub MCP Server ✅

**Purpose**: Docker Hub integration  
**Tools**: 13

**Capabilities**:
- Search Docker images
- View image details and tags
- Pull and manage images
- Repository browsing
- Image metadata retrieval

**Configuration**:
- Local binary installation
- Authentication via Docker Hub PAT

**Environment Variables**:
```bash
HUB_PAT_TOKEN=${DOCKER_HUB_PAT}
DOCKER_HUB_USERNAME=${DOCKER_HUB_USERNAME}
```

**Installation Notes**:
- Requires manual installation from https://github.com/docker/hub-mcp
- Binary located at: `/home/ob/Development/Tools/mcps/hub-mcp/dist/index.js`

**Use Cases**:
- Image discovery and search
- Docker workflow automation
- Image management
- Repository analysis

---

### 5. Docker MCP Server ✅

**Purpose**: Local Docker daemon management  
**Tools**: 19

**Capabilities**:
- Container lifecycle management
- Image operations
- Network and volume management
- Docker Compose integration
- Container inspection and monitoring

**Configuration**:
- Requires running Docker daemon
- Start Docker: `sudo systemctl start docker`

**Prerequisites**:
- Docker daemon must be running
- Proper permissions for Docker socket access

**Use Cases**:
- Container management
- Development workflow automation
- Docker Compose operations
- Image building and tagging

---

### 6. Nanana AI MCP Server ✅

**Purpose**: Nanana AI image generation  
**Tools**: 2

**Capabilities**:
- AI image generation
- Creative content creation
- Image-to-image transformations

**Configuration**:
- API access via Nanana API token
- Get token: https://nanana.app

**Environment Variables**:
```bash
NANANA_API_TOKEN=${NANANA_API_TOKEN}
```

**Use Cases**:
- AI artwork generation
- Creative content creation
- Image generation for projects
- Design inspiration

---

### 7. Imagen3 MCP Server ✅

**Purpose**: Google Imagen 3.0 image generation  
**Tools**: 1

**Capabilities**:
- Advanced AI image generation using Imagen 3.0
- High-quality image synthesis
- Google Cloud integration

**Configuration**:
- Binary installation at `/home/ob/bin/imagen3-mcp`
- Uses Gemini API for operations

**Environment Variables**:
```bash
GEMINI_API_KEY=${GEMINI_API_KEY}
```

**Use Cases**:
- Production-quality image generation
- Google Cloud-integrated workflows
- Advanced AI imaging

---

### 8. Augments MCP Server ✅

**Purpose**: Framework documentation and guidance  
**Tools**: 12

**Capabilities**:
- Access to React documentation
- Next.js framework guidance
- 92+ framework coverage
- Real-time documentation retrieval
- Best practices and patterns

**Configuration**:
- Local installation at `/home/ob/Development/Tools/mcps/augments-mcp-server`
- Requires GitHub token for API access

**Environment Variables**:
```bash
GITHUB_TOKEN=${GITHUB_TOKEN}
```

**Supported Frameworks**:
- React, Next.js, Vue, Angular
- Tailwind CSS, Shadcn UI
- TypeScript, Node.js, Express
- And 80+ more frameworks

**Use Cases**:
- Framework learning and reference
- Best practice discovery
- Documentation lookup
- Migration guidance

---

### 9. Neon MCP Server ✅

**Purpose**: Neon database management and operations  
**Tools**: 29

**Capabilities**:
- **Project Management**: Create, list, describe, delete projects
- **Branch Operations**: Create branches, describe schemas, manage computes
- **SQL Execution**: Run queries, transactions, analyze performance
- **Database Operations**: List tables, describe schemas, manage connections
- **Migrations**: Prepare and complete database migrations safely
- **Query Tuning**: Analyze and optimize query performance
- **Connection Management**: Get connection strings, manage endpoints

**Configuration**:
- API integration with Neon Management API
- Project: `hopeful-sound-470614-r3`

**Environment Variables**:
```bash
NEON_API_KEY=${NEON_API_KEY}
```

**Key Tools**:
- `list_projects`: Enumerate Neon projects
- `run_sql`: Execute SQL queries
- `prepare_database_migration`: Create safe migrations
- `complete_database_migration`: Apply migrations
- `prepare_query_tuning`: Optimize slow queries
- `explain_sql_statement`: Analyze query execution plans
- `get_connection_string`: Retrieve PostgreSQL connection strings

**Use Cases**:
- Database schema management
- Performance optimization
- Safe database migrations
- SQL query analysis
- Branch-based development workflows

---

### 10. Vertex AI MCP Server ✅

**Purpose**: Advanced AI-powered coding assistance  
**Tools**: 29

**Capabilities**:
- **AI Query Tools** (5): Web search grounding, direct queries, documentation-based explanations
- **Filesystem Tools** (8): File operations, directory management, search and metadata
- **Combined Tools** (5): AI-powered file generation and saving
- **Research & Analysis**: Code analysis, documentation synthesis, project guidelines generation

**Configuration**:
- Local installation at `/home/ob/Development/Tools/mcps/vertex-ai-mcp-server`
- Provider: Vertex AI
- Project: `hopeful-sound-470614-r3`
- Location: `us-central1`
- Model: `gemini-2.5-pro-exp-03-25`

**Environment Variables**:
```bash
AI_PROVIDER=vertex
GOOGLE_CLOUD_PROJECT=hopeful-sound-470614-r3
GOOGLE_CLOUD_LOCATION=us-central1
VERTEX_MODEL_ID=gemini-2.5-pro-exp-03-25
AI_TEMPERATURE=0.0
AI_USE_STREAMING=true
AI_MAX_OUTPUT_TOKENS=65536
```

**Key Tools**:
- `answer_query_websearch`: AI queries with web search context
- `answer_query_direct`: Direct AI knowledge queries
- `explain_topic_with_docs`: Documentation-backed explanations
- `get_doc_snippets`: Code snippets from official docs
- `generate_project_guidelines`: Tech stack documentation
- `code_analysis_with_docs`: Code review with best practices
- `read_file_content`, `write_file_content`: File operations
- `search_filesystem`: File search
- `execute_terminal_command`: Shell command execution

**Use Cases**:
- Advanced coding assistance
- Documentation-driven development
- Code review and analysis
- Project setup and guidelines
- Web search-enhanced queries

---

### 11. Vercel MCP Server ⚠️

**Purpose**: Vercel deployment management  
**Tools**: Various

**Status**: Disabled

**Configuration Notes**:
- Requires public URL for OAuth callbacks
- Incompatible with dynamic local tunnels
- Needs pre-registered redirect URL

**Why Disabled**:
- OAuth flow requires static, registered redirect URL
- Local tunneling solutions (like ngrok) don't meet Vercel's security requirements
- Needs persistent public domain for production use

---

## Server Categories

### AI & ML Services
- **Gemini**: General AI capabilities
- **Vertex AI**: Advanced coding assistance
- **Imagen3**: Image generation
- **Nanana**: Creative AI

### Development Tools
- **Serena**: Code analysis & project management
- **Augments**: Framework documentation
- **Shadcn UI**: Component management

### Infrastructure
- **Docker**: Container management
- **Docker Hub**: Image registry
- **Neon**: Database management

---

## Usage

### Starting the Hub

```bash
cd /home/ob/Development/Tools/mcp-hub
npm start
```

### Checking Server Status

```bash
# Get health status
curl http://localhost:7000/api/health

# Get specific server info
curl http://localhost:7000/api/health | jq '.servers[] | select(.name == "neon")'
```

### Using MCP Tools via Clients

Connect any MCP client to: `http://localhost:7000/mcp`

Example client configurations available in the main README.

---

## Environment Variables

All environment variables are loaded from `.env` file automatically. Required variables:

```bash
# GitHub
GITHUB_TOKEN=your_personal_access_token

# Google/Gemini
GEMINI_API_KEY=your_gemini_api_key

# Docker Hub
DOCKER_HUB_USERNAME=your_username
DOCKER_HUB_PAT=your_pat_token

# Neon Database
NEON_API_KEY=your_neon_api_key

# Nanana AI
NANANA_API_TOKEN=your_nanana_token
```

---

## Troubleshooting

### Server Connection Issues

1. **Check server logs**:
   ```bash
   tail -f ~/.local/state/mcp-hub/logs/mcp-hub.log
   ```

2. **Check server status**:
   ```bash
   curl -s http://localhost:7000/api/health | jq '.servers[] | select(.status != "connected")'
   ```

3. **Restart MCP Hub**:
   ```bash
   lsof -ti :7000 | xargs kill -9
   npm start
   ```

### Docker Not Running

```bash
sudo systemctl start docker
sudo systemctl enable docker  # Auto-start on boot
```

### Missing API Keys

Check `.env` file in MCP Hub root directory. Each server requires specific credentials documented above.

### Vertex AI Connection Issues

- Verify Google Cloud authentication
- Check project ID and location settings
- Ensure Vertex AI API is enabled in GCP
- Verify service account permissions

### Neon API Key Issues

- Use Management API key, not Personal Access Token
- Get key from: https://console.neon.tech/
- Key should start with `neon_` or `napi_`

---

## Server Installation Locations

### Local Installations
- **Serena**: `/home/ob/Development/Tools/mcps/serena`
- **Augments**: `/home/ob/Development/Tools/mcps/augments-mcp-server`
- **Vertex AI**: `/home/ob/Development/Tools/mcps/vertex-ai-mcp-server`
- **Docker Hub**: `/home/ob/Development/Tools/mcps/hub-mcp`

### Binaries
- **Imagen3**: `/home/ob/bin/imagen3-mcp`

### NPX-Based (Auto-downloaded)
- **Shadcn UI**: `@jpisnice/shadcn-ui-mcp-server`
- **Gemini**: `gemini-mcp-tool`
- **Neon**: `@neondatabase/mcp-server-neon`
- **Nanana**: `@nanana-ai/mcp-server-nano-banana`

### uvx-Based
- **Docker**: `mcp-server-docker`

---

## Configuration File

All servers are configured in: `mcp-servers.json`

Key configuration patterns:
- **Local servers**: Use `node` or `uv` with absolute paths
- **Remote servers**: Use `npx` with package names
- **Python servers**: Use `uvx` for Python-based MCPs
- **Environment**: Variables automatically loaded from `.env`

---

## Adding New Servers

1. Install the server (local, npx, or binary)
2. Add configuration to `mcp-servers.json`
3. Add required environment variables to `.env`
4. Restart MCP Hub
5. Verify connection in health check

See main README.md for detailed configuration patterns.

---

## Monitoring

### Real-time Events
Connect to SSE stream for live updates:
```bash
curl -N http://localhost:7000/api/events
```

### Health Check
```bash
curl http://localhost:7000/api/health | jq
```

### Server Details
```bash
# List all servers
curl http://localhost:7000/api/servers | jq

# Get specific server info
curl -X POST http://localhost:7000/api/servers/info \
  -H "Content-Type: application/json" \
  -d '{"server_name":"neon"}' | jq
```

---

## References

- **MCP Hub**: Main project at this repository
- **Serena**: https://github.com/sereno-ai/serena
- **Shadcn UI MCP**: https://github.com/Jpisnice/shadcn-ui-mcp-server
- **Gemini**: https://github.com/jamubc/gemini-mcp-tool
- **Neon**: https://github.com/neondatabase/mcp-server-neon
- **Vertex AI**: https://github.com/shariqriazz/vertex-ai-mcp-server
- **Augments**: https://github.com/augmnt/augments-mcp-server
- **Docker**: https://github.com/ckreiling/mcp-server-docker
- **Docker Hub**: https://github.com/docker/hub-mcp

---

Last Updated: 2025-10-27  
MCP Hub Version: 4.2.1  
Active Servers: 9/11

