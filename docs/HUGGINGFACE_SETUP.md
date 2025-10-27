# Hugging Face MCP Server Setup Guide

## Overview
The Hugging Face MCP Server enables you to access and use Hugging Face models, datasets, and spaces through the MCP Hub.

## Prerequisites
- A Hugging Face account
- Access to models and datasets on Hugging Face

## Getting Your Hugging Face Access Token

### Step 1: Log in to Hugging Face
1. Navigate to [Hugging Face](https://huggingface.co/login)
2. Sign in with your credentials

### Step 2: Access Token Settings
1. Click on your profile picture in the top-right corner
2. Select **"Settings"** from the dropdown menu
3. In the sidebar, click on **"Access Tokens"**

### Step 3: Create a New Token
1. Click the **"New token"** button
2. Provide a name for the token (e.g., "MCP Hub Access")
3. Select the token type:
   - **Read** token: For read-only access to public models and datasets
   - **Write** token: For uploading models, creating spaces, and making changes
4. Click **"Generate a token"**

### Step 4: Copy and Secure the Token
1. **Important**: Copy the token immediately - you won't be able to see it again
2. The token will look like: `hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Configuration

### Step 1: Update .env File

Add your Hugging Face token to the `.env` file:

```bash
# Hugging Face MCP Server
HF_TOKEN=your_actual_token_here
```

Replace `your_actual_token_here` with your actual token from Hugging Face.

### Step 2: Enable the Server

The Hugging Face server is disabled by default. To enable it, update `mcp-servers.json`:

```json
"hf-mcp-server": {
  "disabled": false
}
```

Or the server will be enabled when you restart the MCP Hub after adding your token.

### Step 3: Restart MCP Hub

```bash
cd /home/ob/Development/Tools/mcp-hub
npm start
```

## Available Capabilities

The Hugging Face MCP Server provides tools for:

### Model Inference
- Run inference on Hugging Face models
- Use different model architectures (GPT, LLaMA, Mistral, etc.)
- Generate text, images, and other content types

### Dataset Operations
- Access and query datasets
- Load and process data from Hugging Face datasets
- Filter and transform data

### Model Hub
- Search for models
- Get model information and metadata
- Access model documentation

### Spaces
- Deploy and manage Spaces
- Access Space APIs and endpoints

### Example Use Cases

1. **AI Model Inference**: Run inference on various models like GPT, LLaMA, Mistral
2. **Dataset Access**: Access and process data from Hugging Face datasets
3. **Model Search**: Find models for specific use cases
4. **Content Generation**: Generate text, images, or other content types
5. **NLP Tasks**: Perform natural language processing tasks like summarization, translation, etc.

## Troubleshooting

### Token Issues

**401 Unauthorized Error**
- Verify your `HF_TOKEN` is correct
- Check if the token has expired
- Regenerate the token if necessary

**403 Forbidden Error**
- Ensure your token has the required permissions
- For private models or write operations, you need a Write token

### Connection Issues

**Connection Refused**
- Verify the URL is correct: `https://huggingface.co/mcp`
- Check your internet connection
- Ensure there are no firewall restrictions

**Timeout Errors**
- Large model inference may take time
- Consider using smaller or faster models for quick tasks

## Security Notes

- **Store tokens securely**: Keep your HF token in `.env` and never commit it to version control
- **Use appropriate permissions**: Use Read tokens for read-only operations and Write tokens only when needed
- **Rotate tokens regularly**: Generate new tokens periodically for better security
- **Revoke compromised tokens**: If your token is compromised, revoke it immediately from Hugging Face settings

## Token Types

### Read Token
- Access public models and datasets
- Run inference on public models
- View model information and metadata
- Use case: General model access and inference

### Write Token
- All Read token capabilities
- Upload models and datasets
- Create and manage Spaces
- Modify repositories
- Use case: Model development and publishing

## Rate Limits

Hugging Face has rate limits on API usage:
- Free tier: Limited requests per hour
- Pro tier: Higher rate limits
- Enterprise: Custom limits

Monitor your usage and upgrade if needed for higher limits.

## Additional Resources

- [Hugging Face Website](https://huggingface.co)
- [Hugging Face Access Tokens Documentation](https://huggingface.co/docs/hub/security-tokens)
- [Hugging Face Models](https://huggingface.co/models)
- [Hugging Face Datasets](https://huggingface.co/datasets)
- [Hugging Face Spaces](https://huggingface.co/spaces)

