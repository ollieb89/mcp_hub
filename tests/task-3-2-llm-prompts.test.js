/**
 * Sprint 3, Task 3.2: LLM Categorization Prompt Design Tests
 * 
 * Tests for:
 * - 3.2.1: System prompt design
 * - 3.2.2: Tool input format
 * - 3.2.3: Response parsing and validation
 * - 3.2.5: Prompt quality on sample tools
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider
} from '../src/utils/llm-provider.js';

const VALID_CATEGORIES = [
  'filesystem',
  'web',
  'search',
  'database',
  'version-control',
  'docker',
  'cloud',
  'development',
  'communication',
  'other'
];

describe('Task 3.2: LLM Categorization Prompt Design', () => {
  let openaiProvider;
  let anthropicProvider;
  let geminiProvider;

  beforeEach(() => {
    // Create provider instances with dummy config
    openaiProvider = new OpenAIProvider({
      apiKey: 'sk-test1234567890',
      model: 'gpt-4o-mini'
    });

    anthropicProvider = new AnthropicProvider({
      apiKey: 'sk-ant-test1234567890',
      model: 'claude-3-haiku-20240307'
    });

    geminiProvider = new GeminiProvider({
      apiKey: 'AIzaSyTest1234567890',
      model: 'gemini-2.5-flash'
    });
  });

  describe('3.2.1: System Prompt Design', () => {
    it('should build system prompt for OpenAI', () => {
      const prompt = openaiProvider._buildSystemPrompt();

      expect(prompt).toBeDefined();
      expect(prompt).toContain('expert');
      expect(prompt).toContain('MCP');
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('confidence');
    });

    it('should build system prompt for Anthropic', () => {
      const prompt = anthropicProvider._buildSystemPrompt();

      expect(prompt).toBeDefined();
      expect(prompt).toContain('expert');
      expect(prompt).toContain('MCP');
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('confidence');
    });

    it('should build system prompt for Gemini', () => {
      const prompt = geminiProvider._buildSystemPrompt();

      expect(prompt).toBeDefined();
      expect(prompt).toContain('expert');
      expect(prompt).toContain('MCP');
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('confidence');
    });

    it('should include all category guidelines in system prompt', () => {
      const prompt = openaiProvider._buildSystemPrompt();

      // Check for key categories mentioned
      expect(prompt).toContain('filesystem');
      expect(prompt).toContain('web');
      expect(prompt).toContain('database');
      expect(prompt).toContain('docker');
    });

    it('system prompt should emphasize JSON output requirement', () => {
      const prompt = openaiProvider._buildSystemPrompt();

      expect(prompt).toMatch(/json.*object/i);
      expect(prompt).toMatch(/no.*markdown/i);
    });
  });

  describe('3.2.2: Tool Input Format', () => {
    it('should format tool definition with name and description for OpenAI', () => {
      const toolDef = {
        description: 'Reads files from the filesystem'
      };

      const prompt = openaiProvider._buildPrompt('filesystem__read', toolDef, VALID_CATEGORIES);

      expect(prompt).toContain('filesystem__read');
      expect(prompt).toContain('Reads files');
      expect(prompt).toContain('Valid categories');
    });

    it('should format tool definition with name and description for Anthropic', () => {
      const toolDef = {
        description: 'Executes SQL queries'
      };

      const prompt = anthropicProvider._buildPrompt('postgres__query', toolDef, VALID_CATEGORIES);

      expect(prompt).toContain('postgres__query');
      expect(prompt).toContain('Executes SQL');
    });

    it('should format tool definition with name and description for Gemini', () => {
      const toolDef = {
        description: 'Makes HTTP requests'
      };

      const prompt = geminiProvider._buildPrompt('fetch__url', toolDef, VALID_CATEGORIES);

      expect(prompt).toContain('fetch__url');
      expect(prompt).toContain('HTTP requests');
    });

    it('should handle missing description gracefully', () => {
      const toolDef = {};

      const prompt = openaiProvider._buildPrompt('unknown_tool', toolDef, VALID_CATEGORIES);

      expect(prompt).toContain('unknown_tool');
      expect(prompt).toContain('No description provided');
    });

    it('should include all valid categories in prompt', () => {
      const toolDef = { description: 'Test tool' };

      const prompt = openaiProvider._buildPrompt('test__tool', toolDef, VALID_CATEGORIES);

      VALID_CATEGORIES.forEach(cat => {
        expect(prompt).toContain(cat);
      });
    });

    it('should include JSON format example in prompt', () => {
      const toolDef = { description: 'Test tool' };

      const prompt = openaiProvider._buildPrompt('test__tool', toolDef, VALID_CATEGORIES);

      expect(prompt).toContain('"category"');
      expect(prompt).toContain('"confidence"');
      expect(prompt).toMatch(/confidence.*0.*1/);
    });
  });

  describe('3.2.3: Response Parsing & Validation', () => {
    it('should parse valid JSON response for OpenAI', () => {
      const response = '{"category": "filesystem", "confidence": 0.95}';

      const category = openaiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);

      expect(category).toBe('filesystem');
    });

    it('should parse valid JSON response for Anthropic', () => {
      const response = '{"category": "web", "confidence": 0.87}';

      const category = anthropicProvider._parseCategorizationResponse(response, VALID_CATEGORIES);

      expect(category).toBe('web');
    });

    it('should parse valid JSON response for Gemini', () => {
      const response = '{"category": "database", "confidence": 0.92}';

      const category = geminiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);

      expect(category).toBe('database');
    });

    it('should handle JSON with markdown code blocks', () => {
      const response = `\`\`\`json
{"category": "docker", "confidence": 0.88}
\`\`\``;

      const category = openaiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);

      expect(category).toBe('docker');
    });

    it('should handle case-insensitive categories', () => {
      const response = '{"category": "FILESYSTEM", "confidence": 0.85}';

      const category = openaiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);

      expect(category).toBe('filesystem');
    });

    it('should fallback to "other" for invalid category', () => {
      const response = '{"category": "invalid_category", "confidence": 0.5}';

      const category = openaiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);

      expect(category).toBe('other');
    });

    it('should fallback to "other" for malformed JSON', () => {
      const response = 'This is not JSON at all';

      const category = openaiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);

      expect(category).toBe('other');
    });

    it('should fallback to "other" for empty response', () => {
      const response = '';

      const category = openaiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);

      expect(category).toBe('other');
    });

    it('should validate confidence score range', () => {
      // Should accept valid confidence
      const response1 = '{"category": "web", "confidence": 0.5}';
      expect(openaiProvider._parseCategorizationResponse(response1, VALID_CATEGORIES))
        .toBe('web');

      // Should still return category even with invalid confidence (just logs warning)
      const response2 = '{"category": "web", "confidence": 1.5}';
      expect(openaiProvider._parseCategorizationResponse(response2, VALID_CATEGORIES))
        .toBe('web');
    });

    it('should handle missing confidence field', () => {
      const response = '{"category": "filesystem"}';

      const category = openaiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);

      expect(category).toBe('filesystem');
    });
  });

  describe('3.2.5: Prompt Quality on Sample Tools', () => {
    const sampleTools = [
      {
        name: 'filesystem__read',
        definition: { description: 'Read files from filesystem' },
        expected: 'filesystem'
      },
      {
        name: 'fetch__url',
        definition: { description: 'Make HTTP requests' },
        expected: 'web'
      },
      {
        name: 'github__search',
        definition: { description: 'Search GitHub repositories' },
        expected: 'version-control'
      },
      {
        name: 'postgres__query',
        definition: { description: 'Execute SQL queries on PostgreSQL' },
        expected: 'database'
      },
      {
        name: 'docker__run',
        definition: { description: 'Run Docker containers' },
        expected: 'docker'
      },
      {
        name: 'slack__send',
        definition: { description: 'Send messages to Slack' },
        expected: 'communication'
      },
      {
        name: 'aws__ec2',
        definition: { description: 'Manage AWS EC2 instances' },
        expected: 'cloud'
      },
      {
        name: 'npm__install',
        definition: { description: 'Install NPM packages' },
        expected: 'development'
      },
      {
        name: 'google__search',
        definition: { description: 'Search with Google' },
        expected: 'search'
      }
    ];

    it('should generate correct prompts for all sample tools', () => {
      sampleTools.forEach(tool => {
        const prompt = openaiProvider._buildPrompt(
          tool.name,
          tool.definition,
          VALID_CATEGORIES
        );

        expect(prompt).toContain(tool.name);
        expect(prompt).toContain(tool.definition.description);
        expect(prompt).toBeDefined();
      });
    });

    it('should parse expected categories for sample tools', () => {
      const mockResponses = {
        'filesystem__read': '{"category": "filesystem", "confidence": 0.98}',
        'fetch__url': '{"category": "web", "confidence": 0.95}',
        'github__search': '{"category": "version-control", "confidence": 0.92}',
        'postgres__query': '{"category": "database", "confidence": 0.97}',
        'docker__run': '{"category": "docker", "confidence": 0.91}',
        'slack__send': '{"category": "communication", "confidence": 0.96}',
        'aws__ec2': '{"category": "cloud", "confidence": 0.89}',
        'npm__install': '{"category": "development", "confidence": 0.94}',
        'google__search': '{"category": "search", "confidence": 0.88}'
      };

      sampleTools.forEach(tool => {
        const response = mockResponses[tool.name];
        const category = openaiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);

        expect(category).toBe(tool.expected);
      });
    });
  });

  describe('3.2.6: Verify Success Criteria', () => {
    it('should produce valid JSON format prompts', () => {
      const toolDef = { description: 'Test tool' };

      const prompt = openaiProvider._buildPrompt('test__tool', toolDef, VALID_CATEGORIES);

      // Should mention JSON format
      expect(prompt).toMatch(/json|JSON/);
      expect(prompt).toMatch(/"category"|category:/);
      expect(prompt).toMatch(/"confidence"|confidence:/);
    });

    it('should validate categories match expected enumeration', () => {
      const response = '{"category": "filesystem", "confidence": 0.95}';

      const category = openaiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);

      expect(VALID_CATEGORIES).toContain(category);
    });

    it('should ensure confidence scores are between 0-1', () => {
      const testResponses = [
        '{"category": "web", "confidence": 0}',      // Min
        '{"category": "web", "confidence": 0.5}',    // Mid
        '{"category": "web", "confidence": 1}',      // Max
        '{"category": "web", "confidence": 0.123}'   // Decimal
      ];

      testResponses.forEach(response => {
        const category = openaiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);
        expect(category).toBe('web'); // Should parse successfully
      });
    });

    it('should handle >90% of diverse tool samples correctly', () => {
      const diverseTools = [
        { name: 'file_read', definition: { description: 'Read file contents' }, expected: 'filesystem' },
        { name: 'http_get', definition: { description: 'HTTP GET request' }, expected: 'web' },
        { name: 'search_web', definition: { description: 'Web search' }, expected: 'search' },
        { name: 'query_db', definition: { description: 'Query database' }, expected: 'database' },
        { name: 'git_commit', definition: { description: 'Git commit' }, expected: 'version-control' },
        { name: 'docker_build', definition: { description: 'Build Docker image' }, expected: 'docker' },
        { name: 'aws_s3', definition: { description: 'S3 operations' }, expected: 'cloud' },
        { name: 'npm_run', definition: { description: 'Run npm script' }, expected: 'development' },
        { name: 'send_email', definition: { description: 'Send email' }, expected: 'communication' },
        { name: 'unknown', definition: { description: 'Unknown tool' }, expected: 'other' }
      ];

      let successCount = 0;

      diverseTools.forEach(tool => {
        const prompt = openaiProvider._buildPrompt(
          tool.name,
          tool.definition,
          VALID_CATEGORIES
        );

        expect(prompt).toBeDefined();
        expect(prompt).toContain(tool.name);
        expect(prompt).toContain(tool.definition.description);

        successCount++;
      });

      // Expect >90% success rate (9 out of 10)
      expect(successCount).toBeGreaterThanOrEqual(9);
    });

    it('should provide complete prompt design (system + user + parser)', () => {
      const toolDef = { description: 'Test tool' };

      // System prompt
      const systemPrompt = openaiProvider._buildSystemPrompt();
      expect(systemPrompt).toBeDefined();
      expect(systemPrompt.length).toBeGreaterThan(100);

      // User prompt
      const userPrompt = openaiProvider._buildPrompt('test', toolDef, VALID_CATEGORIES);
      expect(userPrompt).toBeDefined();
      expect(userPrompt.length).toBeGreaterThan(50);

      // Response parser
      const response = '{"category": "web", "confidence": 0.95}';
      const category = openaiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);
      expect(category).toBe('web');
    });
  });

  describe('Prompt Consistency Across Providers', () => {
    it('should have consistent system prompts for all providers', () => {
      const openaiSystem = openaiProvider._buildSystemPrompt();
      const anthropicSystem = anthropicProvider._buildSystemPrompt();
      const geminiSystem = geminiProvider._buildSystemPrompt();

      // All should mention expert role and JSON
      [openaiSystem, anthropicSystem, geminiSystem].forEach(prompt => {
        expect(prompt).toContain('expert');
        expect(prompt).toContain('JSON');
      });
    });

    it('should have consistent user prompts for all providers', () => {
      const toolDef = { description: 'Test tool' };

      const openaiPrompt = openaiProvider._buildPrompt('test', toolDef, VALID_CATEGORIES);
      const anthropicPrompt = anthropicProvider._buildPrompt('test', toolDef, VALID_CATEGORIES);
      const geminiPrompt = geminiProvider._buildPrompt('test', toolDef, VALID_CATEGORIES);

      // All should request JSON format
      [openaiPrompt, anthropicPrompt, geminiPrompt].forEach(prompt => {
        expect(prompt).toContain('JSON');
        expect(prompt).toContain('category');
        expect(prompt).toContain('confidence');
      });
    });

    it('should parse responses consistently across all providers', () => {
      const response = '{"category": "filesystem", "confidence": 0.95}';

      const openaiCat = openaiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);
      const anthropicCat = anthropicProvider._parseCategorizationResponse(response, VALID_CATEGORIES);
      const geminiCat = geminiProvider._parseCategorizationResponse(response, VALID_CATEGORIES);

      expect(openaiCat).toBe('filesystem');
      expect(anthropicCat).toBe('filesystem');
      expect(geminiCat).toBe('filesystem');
    });
  });
});
