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

- **Total Servers Configured**: 20
- **Active Servers**: 18
- **Total Tools Available**: 238+
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
**Location**: `~/mcps/serena`

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
- Binary located at: `~/mcps/hub-mcp/dist/index.js`

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
- Binary installation at `~/bin/imagen3-mcp`
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
- Local installation at `~/mcps/augments-mcp-server`
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
- Local installation at `~/mcps/vertex-ai-mcp-server`
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

### 11. GitHub MCP Server ✅

**Purpose**: GitHub repository management and operations  
**Tools**: 46

**Capabilities**:
- **Repository Management**: Search repos, get repo info, manage forks
- **Issue Management**: List, create, update, comment on issues
- **Pull Request Operations**: Create, list, update, merge PRs
- **Code Review**: Review PRs, approve/reject changes
- **Branch Management**: Create, delete, manage branches
- **Release Management**: Create releases, manage tags
- **File Operations**: Read, create, update, delete files
- **Webhook Configuration**: Manage webhooks
- **Search**: Search code, issues, repositories

**Configuration**:
- Official GitHub MCP server
- Binary installation at `~/mcps/github-mcp-server/github-mcp-server`
- Uses `stdio` transport mode

**Environment Variables**:
```bash
GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_TOKEN}
```

**Key Tools**:
- `search_repositories`: Search GitHub repositories
- `get_repository`: Get detailed repo information
- `list_issues`: Browse and filter issues
- `create_pull_request`: Create pull requests
- `merge_pull_request`: Merge PRs with various strategies
- `get_pull_request`: Retrieve PR details
- `list_commits`: View commit history
- `create_release`: Publish releases

**Use Cases**:
- Repository management automation
- Issue tracking and triage
- Code review workflow
- Release management
- Branch strategy enforcement
- Documentation updates

---

### 12. Notion MCP Server ✅

**Purpose**: Notion workspace and database management  
**Tools**: 19

**Capabilities**:
- **Page Management**: Read, create, update, search pages
- **Database Operations**: Query databases, create/update records
- **Comment Management**: Add and retrieve comments
- **Content Access**: Search and retrieve Notion content
- **Block Manipulation**: Manage blocks within pages
- **Property Management**: Read and update page properties

**Configuration**:
- Official Notion MCP server
- Install via: `npx @notionhq/notion-mcp-server`

**Environment Variables**:
```bash
NOTION_TOKEN=${NOTION_API_KEY}
```

**Key Tools**:
- `search_pages`: Search pages across workspace
- `read_page`: Retrieve page content
- `create_page`: Create new pages
- `update_page`: Update existing pages
- `query_database`: Query Notion databases
- `create_database_record`: Add records to databases
- `create_comment`: Add comments to pages

**Use Cases**:
- Content management automation
- Database-driven workflows
- Knowledge base integration
- Documentation sync
- Project management integration

---

### 13. Memory MCP Server ✅

**Purpose**: Persistent knowledge graph management  
**Tools**: 9

**Capabilities**:
- **Entity Management**: Create, read, update, delete entities
- **Relation Management**: Create and delete relationships
- **Observations**: Add observations to entities
- **Graph Search**: Search knowledge graph
- **Memory Persistence**: Cross-session memory storage

**Configuration**:
- Official MCP Memory server
- Install via: `npx @modelcontextprotocol/server-memory`

**Key Tools**:
- `create_entities`: Create multiple entities in knowledge graph
- `create_relations`: Create relationships between entities
- `add_observations`: Add observations to existing entities
- `read_graph`: Retrieve entire knowledge graph
- `search_nodes`: Search for nodes based on query
- `open_nodes`: Open specific nodes by name
- `delete_entities`: Remove entities and relations
- `delete_observations`: Remove specific observations
- `delete_relations`: Remove relationships

**Use Cases**:
- Cross-chat memory
- Knowledge graph construction
- Entity relationship tracking
- Long-term context preservation
- Session continuity

---

### 14. Time MCP Server ✅

**Purpose**: Timezone-aware time operations  
**Tools**: 2

**Capabilities**:
- Get current time in any timezone (IANA standard)
- Convert between timezones
- Time arithmetic and calculations

**Configuration**:
- Official MCP Time server
- Install via: `uvx mcp-server-time`

**Key Tools**:
- `get_current_time`: Get current time in any IANA timezone
- `convert_timezone`: Convert times between timezones

**Use Cases**:
- Timezone conversions for deployments
- Scheduling operations
- International time coordination
- Time-aware automation

---

### 15. Sequential Thinking MCP Server ✅

**Purpose**: Structured problem-solving with dynamic reasoning  
**Tools**: 1

**Capabilities**:
- Dynamic and reflective thinking process
- Thought revision and branching
- Multi-step problem decomposition
- Hypothesis generation and verification

**Configuration**:
- Official MCP Sequential Thinking server
- Install via: `npx @modelcontextprotocol/server-sequential-thinking`

**Key Tool**:
- `sequentialthinking`: Structured problem-solving with thought chains

**Use Cases**:
- Complex problem decomposition
- Multi-step planning
- Hypothesis-driven development
- Architectural decision making
- Code refactoring strategies

---

### 16. Fetch MCP Server ✅

**Purpose**: Web content retrieval and conversion  
**Tools**: 1

**Capabilities**:
- Fetch URLs and retrieve content
- Convert HTML to markdown
- Chunked reading with indexing
- Web scraping and data extraction

**Configuration**:
- Official MCP Fetch server
- Install via: `uvx mcp-server-fetch`

**Key Tool**:
- `fetch`: Fetch URLs and convert HTML to markdown

**Use Cases**:
- Documentation retrieval
- Web scraping for data
- Content analysis
- Link following and verification
- Research automation

---

### 17. Git MCP Server ✅

**Purpose**: Repository version control operations  
**Tools**: 12

**Capabilities**:
- **Repository Operations**: Git status, diff, log
- **Branch Management**: List, create, switch, delete branches
- **Commit Operations**: Stage, commit changes
- **Remote Operations**: Fetch, pull, push
- **File Operations**: Track untracked files

**Configuration**:
- Official MCP Git server
- Install via: `uvx mcp-server-git`

**Key Tools**:
- `git_status`: Get working directory status
- `git_diff`: Show changes between commits
- `git_log`: View commit history
- `git_branch_list`: List all branches
- `git_branch_create`: Create new branches
- `git_branch_switch`: Switch between branches
- `git_commit`: Commit changes
- `git_fetch`: Fetch from remote
- `git_pull`: Pull latest changes
- `git_push`: Push to remote

**Use Cases**:
- Automated version control
- Branch management
- Commit history analysis
- Change tracking
- Code review preparation

---

### 18. Prometheus MCP Server ⚠️

**Purpose**: Prometheus metrics querying and analysis  
**Tools**: 5

**Capabilities**:
- Execute PromQL queries
- List and analyze metrics
- Get metric metadata
- Query targets information
- Range query support

**Configuration**:
- Local installation required
- Location: `~/mcps/prometheus-mcp-server`
- Uses `uv` to run Python server

**Environment Variables**:
```bash
PROMETHEUS_URL=http://your-prometheus-server:9090
```

**Key Tools**:
- `execute_query`: Execute PromQL instant queries
- `execute_range_query`: Range queries with time steps
- `list_metrics`: List all available metrics
- `get_metric_metadata`: Get metric details
- `get_targets`: Get scrape target information

**Status**: Disabled (requires Prometheus URL in .env)

**Use Cases**:
- Metrics analysis and monitoring
- Performance monitoring
- Alert investigation
- System health checks

---

### 19. Pinecone MCP Server ✅

**Purpose**: Vector database operations with Pinecone  
**Tools**: 9

**Capabilities**:
- **Documentation Search**: Search Pinecone official docs
- **Index Management**: List, describe, create indexes
- **Record Operations**: Upsert and search records
- **Integrated Inference**: Embedding with integrated models
- **Metadata Filtering**: Filter searches with metadata
- **Reranking**: Advanced search result reranking

**Configuration**:
- Official Pinecone MCP server
- Install via: `npx @pinecone-database/mcp`

**Environment Variables**:
```bash
PINECONE_API_KEY=${PINECONE_API_KEY}
```

**Key Tools**:
- `search-docs`: Search Pinecone documentation
- `list-indexes`: List all Pinecone indexes
- `describe-index`: Get index configuration
- `describe-index-stats`: Get index statistics
- `create-index-for-model`: Create indexes with integrated inference
- `upsert-records`: Insert/update records
- `search-records`: Search by text query
- `rerank-documents`: Rerank search results
- `cascading-search`: Advanced cascading search

**Use Cases**:
- Vector database management
- Semantic search implementation
- RAG (Retrieval Augmented Generation) workflows
- Document indexing and retrieval
- Product recommendation systems

---

### 20. Vercel MCP Server ⚠️

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
- **Pinecone**: Vector database operations
- **Memory**: Persistent knowledge graphs
- **Sequential Thinking**: Structured problem-solving

### Development Tools
- **Serena**: Code analysis & project management
- **Augments**: Framework documentation
- **Shadcn UI**: Component management
- **Git**: Version control operations
- **GitHub**: Repository management (46 tools)
- **Fetch**: Web content retrieval

### Infrastructure & DevOps
- **Docker**: Container management
- **Docker Hub**: Image registry
- **Neon**: Database management
- **Prometheus**: Metrics monitoring (disabled)
- **Time**: Timezone operations

### Productivity & Collaboration
- **Notion**: Workspace & database management

### Utility Servers
- **Time**: Timezone-aware operations
- **Fetch**: URL fetching & conversion
- **Memory**: Cross-session persistence
- **Sequential Thinking**: Complex reasoning

---

## Usage

### Starting the Hub

```bash
cd ~/mcp-hub
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
# GitHub (required for Shadcn UI, Augments, GitHub MCP)
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

# Notion
NOTION_API_KEY=your_notion_integration_token

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key

# Prometheus (optional, required only if Prometheus server enabled)
PROMETHEUS_URL=http://your-prometheus:9090
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
- **Serena**: `~/mcps/serena`
- **Augments**: `~/mcps/augments-mcp-server`
- **Vertex AI**: `~/mcps/vertex-ai-mcp-server`
- **Docker Hub**: `~/mcps/hub-mcp`
- **GitHub**: `~/mcps/github-mcp-server`
- **Prometheus**: `~/mcps/prometheus-mcp-server`

### Binaries
- **Imagen3**: `~/bin/imagen3-mcp`
- **GitHub**: `~/mcps/github-mcp-server/github-mcp-server`

### NPX-Based (Auto-downloaded)
- **Shadcn UI**: `@jpisnice/shadcn-ui-mcp-server`
- **Gemini**: `gemini-mcp-tool`
- **Neon**: `@neondatabase/mcp-server-neon`
- **Nanana**: `@nanana-ai/mcp-server-nano-banana`
- **Notion**: `@notionhq/notion-mcp-server`
- **Memory**: `@modelcontextprotocol/server-memory`
- **Sequential Thinking**: `@modelcontextprotocol/server-sequential-thinking`
- **Pinecone**: `@pinecone-database/mcp`

### uvx-Based
- **Docker**: `mcp-server-docker`
- **Time**: `mcp-server-time`
- **Fetch**: `mcp-server-fetch`
- **Git**: `mcp-server-git`

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
- **GitHub**: https://github.com/github/github-mcp-server
- **Notion**: https://github.com/makenotion/notion-mcp-server
- **Memory**: https://github.com/modelcontextprotocol/servers/tree/main/src/memory
- **Time**: https://github.com/modelcontextprotocol/servers/tree/main/src/time
- **Sequential Thinking**: https://github.com/modelcontextprotocol/servers/tree/main/src/sequential-thinking
- **Fetch**: https://github.com/modelcontextprotocol/servers/tree/main/src/fetch
- **Git**: https://github.com/modelcontextprotocol/servers/tree/main/src/git
- **Prometheus**: https://github.com/pab1it0/prometheus-mcp-server
- **Pinecone**: https://github.com/pinecone-io/pinecone-mcp

---

Last Updated: 2025-10-27  
MCP Hub Version: 4.2.1  
Active Servers: 18/20

