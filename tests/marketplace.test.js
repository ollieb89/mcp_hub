import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Marketplace, getMarketplace } from "../src/marketplace.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Mock global fetch
global.fetch = vi.fn();
global.URL = URL; // Polyfill URL for tests

// Mock child_process exec for curl fallback (Bun-compatible)
vi.mock('child_process', () => {
  const execMock = vi.fn((cmd, callback) => {
    if (cmd.includes('curl --version')) {
      callback(null, { stdout: 'curl 7.x.x', stderr: '' });
    } else {
      callback(null, { stdout: '{}', stderr: '' });
    }
  });

  return {
    exec: execMock,
    default: { exec: execMock }  // Add default export for compatibility
  };
});

// Mock sample registry data
const mockRegistryData = {
  version: "1.0.0",
  generatedAt: Date.now(),
  totalServers: 3,
  servers: [
    {
      id: "context7",
      name: "Context7",
      description: "Up-to-date code documentation for LLMs.",
      author: "upstash",
      url: "https://github.com/upstash/context7", // Example GitHub URL
      category: "development",
      tags: ["documentation", "code-examples"],
      installations: [],
      featured: true,
      verified: true,
      stars: 16084,
      lastCommit: 1750923365,
      updatedAt: 1751265038,
    },
    {
      id: "filesystem",
      name: "File System",
      description: "Provides comprehensive filesystem operations.",
      author: "modelcontextprotocol",
      url: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem", // Example GitHub URL
      category: "development",
      tags: ["filesystem", "file-management"],
      installations: [],
      featured: false,
      verified: true,
      stars: 56765,
      lastCommit: 1751257963,
      updatedAt: 1751265038,
    },
    {
      id: "sequentialthinking",
      name: "Sequential Thinking",
      description: "A structured problem-solving tool.",
      author: "modelcontextprotocol",
      url: "https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking", // Example GitHub URL
      category: "development",
      tags: ["problem-solving"],
      installations: [],
      featured: false,
      verified: true,
      stars: 123,
      lastCommit: 1751257000,
      updatedAt: 1751265038,
    },
  ],
};

const mockReadmeContent = "# Test Server Readme\nThis is the content of the README file.";
const mockReadmeUrl = "https://raw.githubusercontent.com/upstash/context7/main/README.md";
const mockReadmeUrlFallback = "https://raw.githubusercontent.com/upstash/context7/master/README.md";


describe("Marketplace", () => {
  let marketplace;
  let mockCacheDir;

  beforeEach(async () => {
    // Setup mock cache directory
    mockCacheDir = path.join(os.tmpdir(), ".mcp-hub-test", "cache");
    await fs.mkdir(mockCacheDir, { recursive: true });

    // Create marketplace instance with test config
    marketplace = new Marketplace(1000); // 1 second TTL for testing
    marketplace.cacheFile = path.join(mockCacheDir, "marketplace.json");

    // Reset fetch mock
    fetch.mockReset();
  });

  afterEach(async () => {
    // Cleanup mock cache directory
    await fs.rm(mockCacheDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });
  describe("getCatalog", () => {
    it("should fetch and cache registry when cache is empty", async () => {
      // ARRANGE: Mock successful registry API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });

      // ACT: Fetch catalog (cache empty)
      const result = await marketplace.getCatalog();

      // ASSERT: Verify fetch called and cache written
      expect(result).toHaveLength(3);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        "https://ollieb89.github.io/mcp-registry/registry.json",
        {}
      );

      // Verify cache was written with new structure
      const cacheContent = JSON.parse(
        await fs.readFile(marketplace.cacheFile, "utf-8")
      );
      expect(cacheContent.registry.servers).toHaveLength(3);
      expect(cacheContent.lastFetchedAt).toBeGreaterThan(0);
    });

    it("should use cached registry when valid", async () => {
      // ARRANGE: Populate cache with first call
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });
      await marketplace.getCatalog();

      // ACT: Second call within TTL window
      const result = await marketplace.getCatalog();

      // ASSERT: Verify cache used (no additional fetch)
      expect(result).toHaveLength(3);
      expect(fetch).toHaveBeenCalledTimes(1); // Only called once
    });

    it("should handle search filter", async () => {
      // ARRANGE: Mock registry data
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });

      // ACT: Fetch catalog with search filter
      const result = await marketplace.getCatalog({ search: "file" });

      // ASSERT: Verify filtered results
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("File System");
    });

    it("should handle category filter", async () => {
      // ARRANGE: Mock registry data
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });

      // ACT: Fetch catalog with category filter
      const result = await marketplace.getCatalog({ category: "development" });

      // ASSERT: Verify all development servers returned
      expect(result).toHaveLength(3); // All in mock data are 'development'
    });

    it("should handle sorting by stars", async () => {
      // ARRANGE: Mock registry data
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });

      // ACT: Fetch catalog sorted by stars (descending)
      const result = await marketplace.getCatalog({ sort: "stars" });

      // ASSERT: Verify descending star count order
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("filesystem"); // 56765 stars
      expect(result[1].id).toBe("context7"); // 16084 stars
      expect(result[2].id).toBe("sequentialthinking"); // 123 stars
    });

    it("should handle sorting by newest (lastCommit)", async () => {
      // ARRANGE: Pre-sort data by lastCommit for test clarity
      const sortedRegistryData = {
        ...mockRegistryData,
        servers: [...mockRegistryData.servers].sort((a, b) => (b.lastCommit || 0) - (a.lastCommit || 0))
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sortedRegistryData,
      });

      // ACT: Fetch catalog sorted by newest (lastCommit)
      const result = await marketplace.getCatalog({ sort: "newest" });

      // ASSERT: Verify descending lastCommit order
      expect(result).toHaveLength(3);
      // filesystem (1751257963), sequentialthinking (1751257000), context7 (1750923365)
      expect(result[0].id).toBe("filesystem");
      expect(result[1].id).toBe("sequentialthinking");
      expect(result[2].id).toBe("context7");
    });

    it("should handle sorting by name", async () => {
      // ARRANGE: Mock registry data
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });

      // ACT: Fetch catalog sorted alphabetically by name
      const result = await marketplace.getCatalog({ sort: "name" });

      // ASSERT: Verify alphabetical name order
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("Context7");
      expect(result[1].name).toBe("File System");
      expect(result[2].name).toBe("Sequential Thinking");
    });
  });
  describe("getServerDetails", () => {
    it("should fetch and cache server documentation", async () => {
      // ARRANGE: Mock registry and README fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });
      fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockReadmeContent,
      });

      // ACT: Fetch server details (registry + documentation)
      const result = await marketplace.getServerDetails("context7");

      // ASSERT: Verify server details and documentation fetched/cached
      expect(result.server.id).toBe("context7");
      expect(result.readmeContent).toBe(mockReadmeContent);
      expect(fetch).toHaveBeenCalledTimes(2); // Once for registry, once for README
      expect(fetch).toHaveBeenCalledWith(mockReadmeUrl, {});

      // Verify cache was written
      const cacheContent = JSON.parse(
        await fs.readFile(marketplace.cacheFile, "utf-8")
      );
      expect(cacheContent.serverDocumentation["context7"].content).toBe(mockReadmeContent);
      expect(cacheContent.serverDocumentation["context7"].lastFetchedAt).toBeGreaterThan(0);
    });

    it("should use cached server documentation when valid", async () => {
      // ARRANGE: Populate cache with first call
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });
      fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockReadmeContent,
      });
      await marketplace.getServerDetails("context7");

      // ACT: Second call within TTL window
      const result = await marketplace.getServerDetails("context7");

      // ASSERT: Verify cached data used (no additional fetch)
      expect(result.server.id).toBe("context7");
      expect(result.readmeContent).toBe(mockReadmeContent);
      // Both registry and documentation should be cached, so no additional fetch calls
      expect(fetch).toHaveBeenCalledTimes(2); // 2 calls from the first getServerDetails
    });

    it("should return null readmeContent if documentation cannot be fetched", async () => {
      // ARRANGE: Mock registry success and README failures (main + master branches)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "Not Found"
      });
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "Not Found"
      });

      // ACT: Fetch server details with missing README
      const result = await marketplace.getServerDetails("context7");

      // ASSERT: Verify server found but readme is null
      expect(result.server.id).toBe("context7");
      expect(result.readmeContent).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(3); // Registry + two README attempts
    });

    it("should return undefined if server is not found in registry", async () => {
      // ARRANGE: Mock registry fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistryData,
      });

      // ACT: Request non-existent server
      const result = await marketplace.getServerDetails("non-existent-server");

      // ASSERT: Verify undefined returned, no README fetch attempted
      expect(result).toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(1); // Only registry fetch
    });
  });

  describe("error handling", () => {
    it("should handle network errors during registry fetch", async () => {
      // ARRANGE: Mock both fetch and curl to fail
      fetch.mockRejectedValueOnce(new Error("Network error during registry fetch"));

      // Access the already-mocked exec function (Bun-compatible)
      const childProcess = await import('child_process');
      childProcess.exec.mockImplementationOnce((cmd, callback) => {
        callback(new Error("curl: command not found"));
      });

      // ACT & ASSERT: Verify network error handled gracefully
      await expect(marketplace.getCatalog()).rejects.toThrow(
        "Failed to fetch marketplace registry"
      );
    }, 10000);
    it("should handle invalid API responses (missing servers array)", async () => {
      // ARRANGE: Mock malformed API response (missing servers)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: "1.0.0", generatedAt: 123 }), // Missing 'servers'
      });

      // ACT & ASSERT: Verify error thrown for invalid schema
      await expect(marketplace.getCatalog()).rejects.toThrow(
        "Failed to fetch marketplace registry"
      );
    });

    it("should handle HTTP errors during registry fetch", async () => {
      // ARRANGE: Mock HTTP error (404)
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found"
      });

      // ACT & ASSERT: Verify HTTP error handled
      await expect(marketplace.getCatalog()).rejects.toThrow(
        "Failed to fetch marketplace registry"
      );
    });
  });

  describe("singleton", () => {
    it("should return the same instance", () => {
      // ACT: Get marketplace instance twice
      const instance1 = getMarketplace();
      const instance2 = getMarketplace();

      // ASSERT: Verify singleton pattern
      expect(instance1).toBe(instance2);
    });

    it("should respect custom TTL", () => {
      // ACT: Create marketplace with custom TTL
      const instance = getMarketplace(2000);

      // ASSERT: Verify custom TTL applied
      expect(instance.ttl).toBe(2000);
    });
  });
});

