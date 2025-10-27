# Hugging Face MCP Server OAuth Setup

## Issue

The HuggingFace MCP server at `https://huggingface.co/mcp` requires OAuth 2.0 authentication with a registered OAuth application.

**Error:** `Invalid redirect_uri, must be one of the registered redirect_uris for this client_id`

This occurs because the MCP Hub's OAuth callback URL is not registered in your HuggingFace OAuth application.

## Solution: Create OAuth Application

To use the HuggingFace MCP server, you need to:

### Step 1: Create OAuth Application

1. Log in to your HuggingFace account
2. Go to [OAuth Apps](https://huggingface.co/settings/oauth)
3. Click **"New OAuth Application"**
4. Fill in the details:
   - **Application Name**: MCP Hub
   - **Homepage URL**: `https://your-hub-url.com` (or `http://localhost:7000` for local dev)
   - **Authorization Callback URL**: 
     - For local: `http://localhost:7000/oauth/callback`
     - For production: `https://your-hub-url.com/oauth/callback`
5. Save and note your **Client ID** and **Client Secret**

### Step 2: Update MCP Hub Configuration

Add OAuth credentials to `.env`:

```bash
# Hugging Face OAuth
HF_CLIENT_ID=your_client_id_here
HF_CLIENT_SECRET=your_client_secret_here
HF_REDIRECT_URI=http://localhost:7000/oauth/callback
```

### Step 3: Update mcp-servers.json

```json
{
  "hf-transformers": {
    "type": "streamable-http",
    "url": "https://huggingface.co/mcp",
    "headers": {
      "Authorization": "Bearer ${HF_TOKEN}"
    },
    "env": {
      "HF_TOKEN": "${HF_TOKEN}",
      "HF_CLIENT_ID": "${HF_CLIENT_ID}",
      "HF_CLIENT_SECRET": "${HF_CLIENT_SECRET}",
      "HF_REDIRECT_URI": "${HF_REDIRECT_URI}"
    },
    "disabled": false,
    "note": "Hugging Face MCP Server with OAuth"
  }
}
```

## Alternative: Use HuggingFace Transformers Directly

Since OAuth setup is complex, you can use the HuggingFace Transformers library directly in your applications:

### Python Example

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model_name = "microsoft/DialoGPT-medium"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

# Use your HF_TOKEN
hf_token = "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"
model = AutoModelForCausalLM.from_pretrained(
    model_name, 
    token=hf_token
)
```

### Node.js Example

```javascript
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference('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');

const model = hf.textGeneration({
  model: 'microsoft/DialoGPT-medium',
  inputs: 'Hello! How are you?'
});
```

## Current Status

- **HF_TOKEN**: Configured (`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`)
- **OAuth App**: Not created yet
- **Server Status**: Disabled until OAuth setup complete

## Why OAuth is Required

HuggingFace's MCP server at `https://huggingface.co/mcp` uses OAuth 2.0 for secure authentication rather than simple bearer tokens. This is a security best practice that:

- Provides better session management
- Supports token refresh
- Enables granular permissions
- Allows for audit logging

## Recommendations

1. **For quick access**: Use the HuggingFace Transformers library directly in your code
2. **For MCP integration**: Set up OAuth when you're ready for the full MCP experience
3. **For production**: Create a proper OAuth application with a secure redirect URI

Your HF_TOKEN is already configured and ready to use in your applications directly.

