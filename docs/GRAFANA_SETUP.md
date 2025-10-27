# Grafana MCP Server Setup Guide

## Overview
The Grafana MCP Server enables you to interact with Grafana dashboards, panels, alerts, datasources, and other Grafana resources through the MCP Hub.

## Prerequisites
- A Grafana instance (local or cloud)
- Access to create service account tokens
- Docker installed (for running the server)

## Getting Your Grafana Service Account Token

### For Local Grafana Instance

1. **Log in to Grafana**:
   - Navigate to your Grafana URL (default: http://localhost:4010)
   - Sign in with your credentials

2. **Create a Service Account**:
   - Go to **Administration** → **Users and Access** → **Service Accounts**
   - Click **Create service account**
   - Provide a name (e.g., "MCP Hub Access")
   - Click **Create service account**

3. **Add Token**:
   - In the service account settings, click **Add service account token**
   - Give it a name (e.g., "MCP Hub Token")
   - Set an expiration (optional)
   - Click **Generate token**
   - **Important**: Copy the token immediately - it won't be shown again!

### For Grafana Cloud

1. Log in to [Grafana Cloud](https://grafana.com/login)
2. Navigate to **Organization Settings** → **Service Accounts**
3. Follow the same steps as above to create a service account and token

## Configuration

### Step 1: Update .env File

Add your Grafana configuration to the `.env` file:

```bash
# Grafana MCP Server
GRAFANA_URL=http://localhost:4010
GRAFANA_SERVICE_ACCOUNT_TOKEN=your_actual_token_here
```

**Note**: 
- For Grafana Cloud, use your cloud URL (e.g., `https://your-instance.grafana.net`)
- Replace `your_actual_token_here` with the token you generated

### Step 2: Enable the Server

The Grafana server is disabled by default. To enable it, update `mcp-servers.json`:

```json
"grafana": {
  "disabled": false
}
```

Or restart the MCP Hub after adding your credentials.

## Available Capabilities

### Tools (45+ tools available)

The Grafana MCP Server provides comprehensive tools for:

#### Dashboard Management
- Create, update, delete dashboards
- Search and list dashboards
- Get dashboard details and JSON
- Import/export dashboards

#### Panel Operations
- Create and configure panels
- Update panel properties
- Delete panels
- Get panel details

#### Datasource Management
- List, create, and delete datasources
- Test datasource connections
- Query datasources (Prometheus, Loki, etc.)
- Get datasource details

#### Alerting
- Manage alert rules
- Query alert state
- Get alert notifications
- Configure notification channels

#### Incident Management (Grafana Incident, OnCall)
- Create and manage incidents
- Escalate incidents
- Query incident status

#### Investigations (Sift)
- Manage investigation runbooks
- Query investigation runs

#### Asserts
- Manage check instances
- Query check run status
- Configure check targets

#### Prometheus & Loki Integration
- Query Prometheus metrics
- Query Loki logs
- Query analytics and traces

### Resources

Access to Grafana resources including:
- Dashboards
- Datasources
- Alerts
- Service accounts

### Example Use Cases

1. **Dashboard Automation**: Create and update dashboards programmatically
2. **Monitoring Integration**: Query metrics and logs from Prometheus/Loki
3. **Alert Management**: Configure and manage alerting rules
4. **Incident Response**: Automate incident creation and management
5. **Data Analysis**: Query and analyze observability data

## Docker Configuration

The server runs via Docker using the official image `mcp/grafana:latest`.

### Advanced Docker Options

For enhanced features, you can customize the Docker configuration:

**With debug logging:**
```json
"args": [
  "run", "-i", "--rm",
  "mcp/grafana:latest",
  "-t", "stdio",
  "-debug"
]
```

**With TLS client certificates:**
```json
"args": [
  "run", "-i", "--rm",
  "-v", "/path/to/certs:/certs:ro",
  "mcp/grafana:latest",
  "-t", "stdio",
  "--tls-cert-file", "/certs/client.crt",
  "--tls-key-file", "/certs/client.key",
  "--tls-ca-file", "/certs/ca.crt"
]
```

**Custom Grafana instance:**
```json
"env": {
  "GRAFANA_URL": "https://your-grafana.example.com",
  "GRAFANA_SERVICE_ACCOUNT_TOKEN": "${GRAFANA_SERVICE_ACCOUNT_TOKEN}"
}
```

## Troubleshooting

### Connection Issues

**Error: "Connection refused"**
- Verify GRAFANA_URL is correct and reachable
- Ensure Grafana is running if using local instance
- Check firewall/network settings

**Error: "401 Unauthorized"**
- Verify GRAFANA_SERVICE_ACCOUNT_TOKEN is correct
- Check if the token has expired
- Regenerate the token if needed

**Error: "Bad Request: id is invalid"**
- This typically indicates Grafana version is earlier than 9.0
- Upgrade to Grafana 9.0 or later
- The `/datasources/uid/{uid}` endpoint requires Grafana 9.0+

### Docker Issues

**Error: "Cannot connect to the Docker daemon"**
- Ensure Docker is installed and running
- On Linux, you may need to run: `sudo usermod -aG docker $USER`
- Log out and back in, or restart your terminal

**Error: "Image not found"**
- Pull the image manually: `docker pull mcp/grafana:latest`
- Or let Docker pull it automatically on first run

## Security Notes

- Store your service account token securely in `.env`
- Never commit your `.env` file to version control
- Rotate tokens regularly for better security
- Use tokens with minimal required permissions
- If a token is compromised, revoke it immediately and generate a new one

## Grafana Version Compatibility

- **Minimum**: Grafana 9.0+ (for full datasource functionality)
- **Recommended**: Grafana 10.0+ (latest features and bug fixes)

Some tools may work on older versions but with reduced functionality.

## Additional Resources

- [Grafana MCP Server Repository](https://github.com/grafana/mcp-grafana)
- [Grafana Service Accounts Documentation](https://grafana.com/docs/grafana/latest/administration/service-accounts/)
- [Grafana API Documentation](https://grafana.com/docs/grafana/latest/developers/http_api/)
- [Prometheus Query Language (PromQL)](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Loki Query Language (LogQL)](https://grafana.com/docs/loki/latest/logql/)

