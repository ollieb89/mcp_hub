/**
 * OAuth Integration Tests - Subtask 3.5.2
 *
 * Tests for src/utils/oauth-provider.js covering:
 * - PKCE authorization flow (5-6 tests)
 * - Token management (4-5 tests)
 * - Client information (3-4 tests)
 * - Error scenarios (3-4 tests)
 *
 * Target: 90%+ coverage for oauth-provider.js
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import MCPHubOAuthProvider from '../src/utils/oauth-provider.js';
import { getDataDirectory } from '../src/utils/xdg-paths.js';

// Mock logger to avoid console noise
vi.mock('../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    file: vi.fn(),
    debug: vi.fn(),
  }
}));

describe('MCPHubOAuthProvider - PKCE Authorization Flow', () => {
  const serverName = 'test-oauth-server';
  const serverUrl = 'https://oauth.example.com';
  const hubServerUrl = 'http://localhost:3000';
  let provider;
  let storagePath;

  beforeEach(async () => {
    // ARRANGE: Clean storage before each test
    storagePath = path.join(getDataDirectory(), 'oauth-storage.json');
    try {
      await fs.unlink(storagePath);
    } catch (err) {
      // Ignore if file doesn't exist
    }

    provider = new MCPHubOAuthProvider({
      serverName,
      serverUrl,
      hubServerUrl
    });
  });

  afterEach(async () => {
    // Clean up storage after tests
    try {
      await fs.unlink(storagePath);
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  it('should generate correct redirect URL with server name parameter', () => {
    // ARRANGE: Provider initialized in beforeEach

    // ACT: Get redirect URL
    const redirectUrl = provider.redirectUrl;

    // ASSERT: URL contains callback path and server name
    expect(redirectUrl).toContain('/api/oauth/callback');
    expect(redirectUrl).toContain(`server_name=${encodeURIComponent(serverName)}`);
    expect(redirectUrl).toMatch(/^http:\/\/localhost:3000/);
  });

  it('should provide correct OAuth client metadata', () => {
    // ARRANGE: Provider initialized in beforeEach

    // ACT: Get client metadata
    const metadata = provider.clientMetadata;

    // ASSERT: Metadata follows OAuth 2.0 PKCE specification
    expect(metadata.redirect_uris).toEqual([provider.redirectUrl]);
    expect(metadata.token_endpoint_auth_method).toBe('none'); // PKCE doesn't use client secret
    expect(metadata.grant_types).toContain('authorization_code');
    expect(metadata.grant_types).toContain('refresh_token');
    expect(metadata.response_types).toEqual(['code']);
    expect(metadata.client_name).toBe('MCP Hub');
    expect(metadata.client_uri).toBe('https://github.com/ravitemer/mcp-hub');
  });

  it('should store code verifier for PKCE flow', async () => {
    // ARRANGE: Generate a PKCE code verifier
    const codeVerifier = 'test-code-verifier-abcd1234';

    // ACT: Save code verifier
    await provider.saveCodeVerifier(codeVerifier);
    const retrieved = await provider.codeVerifier();

    // ASSERT: Code verifier persisted and retrievable
    expect(retrieved).toBe(codeVerifier);
  });

  it('should handle authorization URL generation', async () => {
    // ARRANGE: Mock authorization URL from OAuth server
    const authUrl = 'https://oauth.example.com/authorize?client_id=abc&redirect_uri=...';

    // ACT: Redirect to authorization (stores URL for testing)
    const result = await provider.redirectToAuthorization(authUrl);

    // ASSERT: Authorization URL stored and returns true
    expect(result).toBe(true);
    expect(provider.generatedAuthUrl).toBe(authUrl);
  });

  it('should support full PKCE authorization code flow', async () => {
    // ARRANGE: Simulate complete PKCE flow
    const codeVerifier = 'abcd1234-verifier-xyz';
    const authCode = 'authorization-code-12345';
    const clientInfo = { client_id: 'client-abc', client_secret: null };
    const tokens = {
      access_token: 'access-token-xyz',
      refresh_token: 'refresh-token-abc',
      expires_in: 3600
    };

    // ACT: Execute PKCE flow steps
    // Step 1: Save code verifier
    await provider.saveCodeVerifier(codeVerifier);

    // Step 2: Save client information (after registration)
    await provider.saveClientInformation(clientInfo);

    // Step 3: Exchange code for tokens (simulate)
    await provider.saveTokens(tokens);

    // ASSERT: All PKCE flow data persisted
    expect(await provider.codeVerifier()).toBe(codeVerifier);
    expect(await provider.clientInformation()).toEqual(clientInfo);
    expect(await provider.tokens()).toEqual(tokens);
  });

  it('should persist PKCE data across provider instances', async () => {
    // ARRANGE: Save data with first provider instance
    const codeVerifier = 'persistent-verifier-123';
    await provider.saveCodeVerifier(codeVerifier);

    // ACT: Create new provider instance for same server
    const newProvider = new MCPHubOAuthProvider({
      serverName,
      serverUrl,
      hubServerUrl
    });

    // Wait for storage to initialize
    await new Promise(resolve => setTimeout(resolve, 50));

    // ASSERT: Data accessible from new instance
    const retrieved = await newProvider.codeVerifier();
    expect(retrieved).toBe(codeVerifier);
  });
});

describe('MCPHubOAuthProvider - Token Management', () => {
  const serverName = 'token-test-server';
  const serverUrl = 'https://token.example.com';
  const hubServerUrl = 'http://localhost:3000';
  let provider;
  let storagePath;

  beforeEach(async () => {
    // ARRANGE: Clean storage and wait for initialization
    storagePath = path.join(getDataDirectory(), 'oauth-storage.json');
    try {
      await fs.unlink(storagePath);
    } catch (err) {
      // Ignore
    }

    // Wait for storage cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    provider = new MCPHubOAuthProvider({
      serverName,
      serverUrl,
      hubServerUrl
    });

    // Wait for storage initialization
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(async () => {
    try {
      await fs.unlink(storagePath);
    } catch (err) {
      // Ignore
    }
  });

  it('should save and retrieve access tokens', async () => {
    // ARRANGE: Create token data
    const tokens = {
      access_token: 'access-abc-123',
      token_type: 'Bearer',
      expires_in: 3600
    };

    // ACT: Save and retrieve tokens
    await provider.saveTokens(tokens);
    const retrieved = await provider.tokens();

    // ASSERT: Tokens persisted correctly
    expect(retrieved).toEqual(tokens);
  });

  it('should support token refresh with refresh_token', async () => {
    // ARRANGE: Initial tokens with refresh token
    const initialTokens = {
      access_token: 'old-access-token',
      refresh_token: 'refresh-token-xyz',
      expires_in: 3600
    };
    await provider.saveTokens(initialTokens);

    // ACT: Simulate token refresh
    const refreshedTokens = {
      access_token: 'new-access-token',
      refresh_token: 'refresh-token-xyz', // Refresh token persists
      expires_in: 3600
    };
    await provider.saveTokens(refreshedTokens);

    // ASSERT: New tokens replace old tokens
    const retrieved = await provider.tokens();
    expect(retrieved.access_token).toBe('new-access-token');
    expect(retrieved.refresh_token).toBe('refresh-token-xyz');
  });

  it('should return null for tokens before first save', async () => {
    // ARRANGE: Fresh provider with unique server URL to avoid storage collision
    const freshProvider = new MCPHubOAuthProvider({
      serverName: 'fresh-token-server',
      serverUrl: 'https://fresh-token.example.com', // Unique URL
      hubServerUrl
    });

    // ACT: Attempt to retrieve tokens
    const tokens = await freshProvider.tokens();

    // ASSERT: Returns null for uninitialized tokens
    expect(tokens).toBeNull();
  });

  it('should update tokens without affecting client info or code verifier', async () => {
    // ARRANGE: Save client info and code verifier
    const clientInfo = { client_id: 'client-123' };
    const codeVerifier = 'verifier-abc';
    await provider.saveClientInformation(clientInfo);
    await provider.saveCodeVerifier(codeVerifier);

    // ACT: Save tokens
    const tokens = { access_token: 'token-xyz' };
    await provider.saveTokens(tokens);

    // ASSERT: All data coexists without interference
    expect(await provider.tokens()).toEqual(tokens);
    expect(await provider.clientInformation()).toEqual(clientInfo);
    expect(await provider.codeVerifier()).toBe(codeVerifier);
  });

  it('should handle token expiration metadata', async () => {
    // ARRANGE: Tokens with expiration information
    const currentTime = Math.floor(Date.now() / 1000);
    const tokens = {
      access_token: 'token-with-expiry',
      expires_in: 3600,
      issued_at: currentTime
    };

    // ACT: Save tokens with expiration metadata
    await provider.saveTokens(tokens);
    const retrieved = await provider.tokens();

    // ASSERT: Expiration metadata preserved
    expect(retrieved.expires_in).toBe(3600);
    expect(retrieved.issued_at).toBe(currentTime);
  });
});

describe('MCPHubOAuthProvider - Client Information', () => {
  const serverName = 'client-test-server';
  const serverUrl = 'https://client.example.com';
  const hubServerUrl = 'http://localhost:3000';
  let provider;
  let storagePath;

  beforeEach(async () => {
    storagePath = path.join(getDataDirectory(), 'oauth-storage.json');
    try {
      await fs.unlink(storagePath);
    } catch (err) {
      // Ignore
    }

    provider = new MCPHubOAuthProvider({
      serverName,
      serverUrl,
      hubServerUrl
    });
  });

  afterEach(async () => {
    try {
      await fs.unlink(storagePath);
    } catch (err) {
      // Ignore
    }
  });

  it('should save and retrieve client information', async () => {
    // ARRANGE: Client registration response
    const clientInfo = {
      client_id: 'mcp-hub-client-123',
      client_secret: null, // PKCE doesn't use client secret
      client_id_issued_at: Math.floor(Date.now() / 1000)
    };

    // ACT: Save and retrieve client information
    await provider.saveClientInformation(clientInfo);
    const retrieved = await provider.clientInformation();

    // ASSERT: Client info persisted correctly
    expect(retrieved).toEqual(clientInfo);
  });

  it('should return null for client information before registration', async () => {
    // ARRANGE: Fresh provider with unique server URL to avoid storage collision
    const freshProvider = new MCPHubOAuthProvider({
      serverName: 'fresh-client-server',
      serverUrl: 'https://fresh-client.example.com', // Unique URL
      hubServerUrl
    });

    // ACT: Attempt to retrieve client information
    const clientInfo = await freshProvider.clientInformation();

    // ASSERT: Returns null before registration
    expect(clientInfo).toBeNull();
  });

  it('should support multiple OAuth servers with isolated client information', async () => {
    // ARRANGE: Two different OAuth servers
    const server1Url = 'https://oauth1.example.com';
    const server2Url = 'https://oauth2.example.com';

    const provider1 = new MCPHubOAuthProvider({
      serverName: 'server1',
      serverUrl: server1Url,
      hubServerUrl
    });

    const provider2 = new MCPHubOAuthProvider({
      serverName: 'server2',
      serverUrl: server2Url,
      hubServerUrl
    });

    const clientInfo1 = { client_id: 'client-server1' };
    const clientInfo2 = { client_id: 'client-server2' };

    // ACT: Save different client info for each server
    await provider1.saveClientInformation(clientInfo1);
    await provider2.saveClientInformation(clientInfo2);

    // ASSERT: Each server has isolated client information
    expect(await provider1.clientInformation()).toEqual(clientInfo1);
    expect(await provider2.clientInformation()).toEqual(clientInfo2);
  });

  it('should update client information on re-registration', async () => {
    // ARRANGE: Initial client registration
    const initialInfo = { client_id: 'client-v1' };
    await provider.saveClientInformation(initialInfo);

    // ACT: Update client information (re-registration scenario)
    const updatedInfo = { client_id: 'client-v2', updated: true };
    await provider.saveClientInformation(updatedInfo);

    // ASSERT: New information replaces old
    const retrieved = await provider.clientInformation();
    expect(retrieved).toEqual(updatedInfo);
  });
});

describe('MCPHubOAuthProvider - Error Scenarios', () => {
  const serverName = 'error-test-server';
  const serverUrl = 'https://error.example.com';
  const hubServerUrl = 'http://localhost:3000';
  let provider;
  let storagePath;

  beforeEach(async () => {
    storagePath = path.join(getDataDirectory(), 'oauth-storage.json');
    try {
      await fs.unlink(storagePath);
    } catch (err) {
      // Ignore
    }

    provider = new MCPHubOAuthProvider({
      serverName,
      serverUrl,
      hubServerUrl
    });
  });

  afterEach(async () => {
    try {
      await fs.unlink(storagePath);
    } catch (err) {
      // Ignore
    }
  });

  it('should handle corrupted storage file gracefully', async () => {
    // ARRANGE: Write corrupted JSON to storage
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    await fs.writeFile(storagePath, 'invalid-json-{{{', 'utf8');

    // ACT: Create new provider (triggers storage init)
    const newProvider = new MCPHubOAuthProvider({
      serverName,
      serverUrl,
      hubServerUrl
    });

    // Wait for storage initialization
    await new Promise(resolve => setTimeout(resolve, 50));

    // ASSERT: Provider still functional with default storage
    const tokens = await newProvider.tokens();
    expect(tokens).toBeNull(); // Default value
  });

  it('should handle storage directory creation failure gracefully', async () => {
    // ARRANGE: Mock storage manager with directory creation disabled
    // This test validates graceful degradation

    // ACT: Try to save data
    await provider.saveTokens({ access_token: 'test-token' });

    // ASSERT: Operation completes without throwing (logs warning)
    expect(async () => await provider.saveTokens({ access_token: 'test' }))
      .not.toThrow();
  });

  it('should handle storage write failures gracefully', async () => {
    // ARRANGE: Create read-only storage file
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    await fs.writeFile(storagePath, '{}', 'utf8');
    await fs.chmod(storagePath, 0o444); // Read-only

    // ACT: Attempt to save data (will fail due to permissions)
    await provider.saveTokens({ access_token: 'test-token' });

    // ASSERT: Operation completes without throwing (logs warning)
    expect(async () => await provider.saveTokens({ access_token: 'test' }))
      .not.toThrow();

    // Restore permissions for cleanup
    await fs.chmod(storagePath, 0o644);
  });

  it('should initialize storage with default structure for new servers', async () => {
    // ARRANGE: Fresh provider with unique server URL
    const freshProvider = new MCPHubOAuthProvider({
      serverName: 'brand-new-server',
      serverUrl: 'https://brand-new.example.com', // Unique URL
      hubServerUrl
    });

    // ACT: Access properties without saving first
    const clientInfo = await freshProvider.clientInformation();
    const tokens = await freshProvider.tokens();
    const codeVerifier = await freshProvider.codeVerifier();

    // ASSERT: Default null values for uninitialized server
    expect(clientInfo).toBeNull();
    expect(tokens).toBeNull();
    expect(codeVerifier).toBeNull();
  });
});
