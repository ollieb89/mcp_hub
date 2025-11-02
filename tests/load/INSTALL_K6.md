# k6 Installation Guide

Quick reference for installing k6 load testing tool on various platforms.

## Ubuntu/Debian (Recommended for Development)

```bash
# Add k6 GPG key
sudo gpg -k
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69

# Add k6 repository
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list

# Update and install
sudo apt-get update
sudo apt-get install k6

# Verify installation
k6 version
```

## macOS

```bash
# Using Homebrew
brew install k6

# Verify installation
k6 version
```

## Windows

### Using Chocolatey
```powershell
choco install k6
```

### Using Winget
```powershell
winget install k6 --source winget
```

### Manual Installation
1. Download from https://dl.k6.io/msi/k6-latest-amd64.msi
2. Run the installer
3. Verify: `k6 version`

## Docker (Cross-Platform)

```bash
# Run k6 in Docker
docker run --rm -i grafana/k6 run - <tests/load/basic-mcp-endpoint.js

# With network access to host
docker run --rm -i --network="host" grafana/k6 run - <tests/load/basic-mcp-endpoint.js
```

## Binary Download (Manual Installation)

### Linux (AMD64)
```bash
wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz
tar -xzf k6-v0.47.0-linux-amd64.tar.gz
sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/
k6 version
```

### Linux (ARM64)
```bash
wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-arm64.tar.gz
tar -xzf k6-v0.47.0-linux-arm64.tar.gz
sudo mv k6-v0.47.0-linux-arm64/k6 /usr/local/bin/
k6 version
```

### macOS (Universal Binary)
```bash
curl -LO https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-macos-universal.tar.gz
tar -xzf k6-v0.47.0-macos-universal.tar.gz
sudo mv k6-v0.47.0-macos-universal/k6 /usr/local/bin/
k6 version
```

## Verification

After installation, verify k6 is working:

```bash
# Check version
k6 version

# Expected output:
# k6 v0.47.0 ((devel), go1.20.6, linux/amd64)

# Run a simple test
k6 run --vus 1 --duration 5s - <<EOF
import http from 'k6/http';
export default function () {
  http.get('https://test.k6.io');
}
EOF
```

## Troubleshooting

### Command Not Found
```bash
# Add k6 to PATH (if installed manually)
export PATH=$PATH:/usr/local/bin

# Make permanent (add to ~/.bashrc or ~/.zshrc)
echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
source ~/.bashrc
```

### Permission Denied
```bash
# Fix k6 binary permissions
sudo chmod +x /usr/local/bin/k6
```

### Ubuntu GPG Key Issues
```bash
# If GPG key import fails, try alternative keyserver
sudo gpg --keyserver keyserver.ubuntu.com \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
```

## Next Steps

After installation:

1. **Run Quick Test**:
```bash
cd /home/ob/Development/Tools/mcp-hub
bun start &  # Start MCP Hub
bun run test:load  # Run load test
```

2. **Review Documentation**:
- [Load Testing README](./README.md)
- [Baseline Metrics](./baseline-metrics.json)

3. **Explore Test Scenarios**:
```bash
ls tests/load/
# basic-mcp-endpoint.js  - Normal load testing
# stress-test.js         - Find breaking point
# spike-test-llm.js      - LLM filtering spike test
```

## Resources

- [k6 Official Documentation](https://k6.io/docs/)
- [k6 GitHub Releases](https://github.com/grafana/k6/releases)
- [k6 Installation Guide](https://k6.io/docs/get-started/installation/)
