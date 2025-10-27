# Vercel MCP Server Setup Guide

## Overview
The Vercel MCP Server enables you to manage Vercel deployments, preview environments, and project configurations through the MCP Hub.

## Prerequisites
- A Vercel account
- Access to your Vercel projects

## Getting Your Vercel API Token

### Step 1: Log in to Vercel
1. Navigate to [Vercel's login page](https://vercel.com/login)
2. Sign in with your credentials

### Step 2: Access Account Settings
1. Click on your profile picture or initials in the top-right corner
2. Select **"Settings"** from the dropdown menu

### Step 3: Create API Token
1. In the settings sidebar, click on **"Tokens"** under the Account section
2. Click the **"Create"** button
3. Provide a descriptive name (e.g., "MCP Hub Access")
4. Set the desired expiration date and permissions
5. Click **"Create"** to generate the token

### Step 4: Copy and Configure
1. **Important**: Copy the token immediately - Vercel will not display it again
2. Open your `.env` file in the MCP Hub directory
3. Replace `your_vercel_token_here` with your actual token:
   ```bash
   VERCEL_TOKEN=your_actual_token_here
   ```

## Verifying Configuration

After adding your token to `.env`, restart the MCP Hub:

```bash
cd /home/ob/Development/Tools/mcp-hub
npm start
```

Check the Vercel server status:
```bash
curl -s http://localhost:7000/api/servers | jq '.servers[] | select(.name == "vercel")'
```

## Available Capabilities

The Vercel MCP Server provides tools for:
- **Deployment Management**: Deploy, list, and manage deployments
- **Preview Environments**: Access and manage preview URLs
- **Project Configuration**: View and update project settings
- **Logs**: Access deployment and build logs
- **Aliases**: Manage domain aliases and custom domains

## Troubleshooting

### Token Issues
- **401 Unauthorized**: Token may be invalid or expired. Generate a new token from Vercel Settings
- **Permission Errors**: Ensure your token has the required permissions for the operations you need

### Connection Issues
- Verify the token is correctly set in `.env`
- Check that there are no extra spaces or quotes around the token
- Ensure the MCP Hub has been restarted after adding the token

## Security Notes

- Store your token securely in `.env`
- Never commit your `.env` file to version control
- If your token is compromised, revoke it immediately from Vercel Settings and generate a new one
- Use tokens with minimal required permissions

## Additional Resources

- [Vercel API Documentation](https://vercel.com/docs/rest-api)
- [Vercel MCP Server GitHub](https://github.com/vercel/vercel-mcp)

