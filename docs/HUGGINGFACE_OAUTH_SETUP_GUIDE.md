# HuggingFace OAuth Setup Guide for MCP Hub

## Prerequisites
- HuggingFace account with access
- MCP Hub running on a reachable URL (localhost for development, or a public URL)

## Step 1: Create OAuth Application

1. **Navigate to HuggingFace OAuth Settings**
   - Go to: https://huggingface.co/settings/oauth
   - Click **"New OAuth Application"**

2. **Fill in Application Details**
   - **Application Name**: `MCP Hub`
   - **Homepage URL**: 
     - Development: `http://localhost:7000`
     - Production: `https://your-production-url.com`
   - **Application Description**: `MCP Hub integration for HuggingFace model access`

3. **Configure Authorization Callback URL**
   This is CRITICAL - must match exactly:
   - Development: `http://localhost:7000/oauth/callback`
   - Production: `https://your-production-url.com/oauth/callback`
   
   ⚠️ **Note**: No trailing slash, and must be registered exactly

4. **Set Application Type**
   - **Trusted**: For personal use
   - **Public**: If you want others to use it

5. **Save and Note Credentials**
   After creating, you'll get:
   - `Client ID` (public)
   - `Client Secret` (keep secure!)

## Step 2: Get Your Access Token

While you're at HuggingFace:
1. Go to: https://huggingface.co/settings/tokens
2. Create a new token (if you haven't already)
3. Copy the token (starts with `hf_`)

## Step 3: Configure MCP Hub

### Add Credentials to .env

```bash
# Hugging Face OAuth Configuration
HF_CLIENT_ID=your_client_id_here
HF_CLIENT_SECRET=your_client_secret_here
HF_REDIRECT_URI=http://localhost:7000/oauth/callback
HF_TOKEN=hf_your_token_here
```

### Update mcp-servers.json

The configuration will be updated to include OAuth support.

## Step 4: Restart MCP Hub

After adding credentials, restart the MCP Hub:

```bash
cd /home/ob/Development/Tools/mcp-hub
npm start
```

## Step 5: Test Connection

1. Check if the server appears in the UI
2. Try accessing HuggingFace tools
3. If OAuth is required, the hub will open a browser for authentication

## Troubleshooting

### "Invalid redirect_uri" Error
- **Cause**: Redirect URI doesn't match registered callback URL
- **Fix**: Ensure the redirect URI in `.env` exactly matches what you registered

### "Invalid client_id" Error
- **Cause**: Client ID is incorrect
- **Fix**: Double-check the client ID from HuggingFace settings

### "Unauthorized" Error
- **Cause**: Client secret is incorrect or token is expired
- **Fix**: Regenerate credentials and update `.env`

## Security Notes

- **Never commit** `.env` file to version control
- **Client Secret** is sensitive - treat like a password
- **Rotate credentials** periodically for better security
- **Use HTTPS** in production environments

## Current Configuration

Your current HF_TOKEN is:
```
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
```

This token can be used directly in your applications without OAuth.

## Alternative: Direct API Usage

If OAuth setup is too complex, you can use the HF_TOKEN directly:

### Python
```python
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(
    "model-name",
    token="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"
)
```

### Node.js
```javascript
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference('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');
```

## Next Steps

1. Create the OAuth application (Step 1)
2. Copy the Client ID and Client Secret
3. Add them to `.env`
4. Update `mcp-servers.json`
5. Test the connection

Let me know when you've created the OAuth application and I'll help you complete the configuration!

