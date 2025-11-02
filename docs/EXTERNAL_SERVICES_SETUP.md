# External Services Setup Guide

Quick reference for configuring external MCP services with MCP Hub.

## HuggingFace MCP Server

### Prerequisites
- HuggingFace account ([Sign up](https://huggingface.co/join))
- Access to models and datasets

### Getting Your Access Token

1. **Navigate to [Hugging Face Access Tokens](https://huggingface.co/settings/tokens)**
2. **Create a New Token**:
   - Name: "MCP Hub Access"
   - Type: **Read** (public models) or **Write** (upload/modify)
3. **Copy the token** (starts with `hf_`)

### Configuration

**Update `.env`**:
```bash
HF_TOKEN=hf_your_token_here
```

**Enable in `mcp-servers.json`**:
```json
{
  "hf-mcp-server": {
    "disabled": false
  }
}
```

**Restart MCP Hub**:
```bash
cd /home/ob/Development/Tools/mcp-hub
npm start
```

### OAuth Setup (Optional)

For advanced features requiring OAuth 2.0:

1. **Create OAuth Application** at [HuggingFace OAuth Settings](https://huggingface.co/settings/oauth)
   - Application Name: `MCP Hub`
   - Homepage URL: `http://localhost:7000` (dev) or `https://your-domain.com` (production)
   - Callback URL: `http://localhost:7000/oauth/callback` (exact match required)
   - Type: **Trusted** (personal) or **Public**

2. **Update `.env`**:
```bash
HF_CLIENT_ID=your_client_id_here
HF_CLIENT_SECRET=your_client_secret_here
HF_REDIRECT_URI=http://localhost:7000/oauth/callback
HF_TOKEN=hf_your_token_here
```

3. **Restart and test**

### Capabilities
- **Model Inference**: Run inference on HuggingFace models (GPT, LLaMA, Mistral, etc.)
- **Dataset Operations**: Access and query datasets
- **Model Hub**: Search models, get metadata
- **Spaces**: Deploy and manage Spaces

### Troubleshooting

**401 Unauthorized**: Token incorrect or expired → regenerate token
**403 Forbidden**: Insufficient permissions → use Write token for private models
**Connection Refused**: Verify URL and internet connection
**Timeout**: Large model inference takes time → use smaller models

---

## Grafana MCP Server

### Prerequisites
- Grafana instance (local or cloud)
- Docker installed (for running the server)

### Getting Your Service Account Token

**Local Grafana** (http://localhost:4010):
1. **Administration** → **Users and Access** → **Service Accounts**
2. **Create service account**: Name "MCP Hub Access"
3. **Add service account token**: Name "MCP Hub Token"
4. **Copy the token immediately**

**Grafana Cloud**:
1. Log in to [Grafana Cloud](https://grafana.com/login)
2. **Organization Settings** → **Service Accounts**
3. Follow same steps as local instance

### Configuration

**Update `.env`**:
```bash
GRAFANA_URL=http://localhost:4010
GRAFANA_SERVICE_ACCOUNT_TOKEN=your_token_here
```

**Enable in `mcp-servers.json`**:
```json
{
  "grafana": {
    "disabled": false
  }
}
```

### Capabilities (45+ tools)
- **Dashboard Management**: Create, update, delete, import/export
- **Panel Operations**: Create, configure, update panels
- **Datasource Management**: List, create, test, query datasources (Prometheus, Loki)
- **Alerting**: Manage alert rules, notifications
- **Incident Management**: Grafana Incident, OnCall
- **Investigations**: Sift runbooks
- **Analytics**: Query Prometheus metrics and Loki logs

### Troubleshooting

**Connection Refused**: Verify GRAFANA_URL and ensure Grafana is running
**401 Unauthorized**: Token incorrect/expired → regenerate token
**Bad Request: id is invalid**: Requires Grafana 9.0+ → upgrade version
**Docker daemon error**: Ensure Docker is running → `sudo usermod -aG docker $USER`

---

## Vercel MCP Server

### Prerequisites
- Vercel account
- Access to Vercel projects

### Getting Your API Token

1. **Navigate to [Vercel Settings](https://vercel.com/account/tokens)**
2. **Create Token**:
   - Name: "MCP Hub Access"
   - Expiration: Set as needed
3. **Copy the token immediately**

### Configuration

**Update `.env`**:
```bash
VERCEL_TOKEN=your_vercel_token_here
```

**Restart MCP Hub**:
```bash
cd /home/ob/Development/Tools/mcp-hub
npm start
```

**Verify**:
```bash
curl -s http://localhost:7000/api/servers | jq '.servers[] | select(.name == "vercel")'
```

### Capabilities
- **Deployment Management**: Deploy, list, manage deployments
- **Preview Environments**: Access preview URLs
- **Project Configuration**: View and update settings
- **Logs**: Access deployment and build logs
- **Aliases**: Manage domain aliases

### Troubleshooting

**401 Unauthorized**: Token invalid/expired → regenerate from Vercel Settings
**Permission Errors**: Token lacks required permissions → check token scope

---

## Security Best Practices

- **Store tokens in `.env`**: Never commit to version control
- **Use minimal permissions**: Read-only when possible
- **Rotate tokens regularly**: Regenerate periodically
- **Revoke compromised tokens**: Immediately if exposed
- **Use HTTPS in production**: Encrypt OAuth callbacks

## Additional Resources

- [HuggingFace Docs](https://huggingface.co/docs)
- [Grafana MCP Server](https://github.com/grafana/mcp-grafana)
- [Vercel API Docs](https://vercel.com/docs/rest-api)
