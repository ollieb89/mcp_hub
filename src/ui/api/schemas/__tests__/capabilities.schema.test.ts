/**
 * Unit tests for capabilities schema validation.
 *
 * Tests validate MCP-compliant schemas for tools, resources, prompts,
 * and resource templates according to protocol specification.
 */

import { describe, it, expect } from 'vitest';
import {
  ToolSchemaMinimal,
  ResourceSchemaMinimal,
  ResourceTemplateSchemaMinimal,
  PromptArgumentSchemaMinimal,
  PromptSchemaMinimal,
  CapabilitiesSchema,
} from '../health.schema';

// ============================================================================
// Tool Schema Tests
// ============================================================================

describe('ToolSchemaMinimal', () => {
  describe('valid tool objects', () => {
    it('should validate tool with all required fields', () => {
      const validTool = {
        name: 'github__search',
        description: 'Search GitHub repositories',
      };

      const result = ToolSchemaMinimal.safeParse(validTool);
      expect(result.success).toBe(true);
    });

    it('should validate tool with optional inputSchema', () => {
      const validTool = {
        name: 'calculator__add',
        description: 'Add two numbers',
        inputSchema: {
          type: 'object',
          properties: {
            a: { type: 'number' },
            b: { type: 'number' },
          },
          required: ['a', 'b'],
        },
      };

      const result = ToolSchemaMinimal.safeParse(validTool);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.inputSchema).toEqual(validTool.inputSchema);
      }
    });

    it('should validate tool with complex inputSchema (nested objects)', () => {
      const validTool = {
        name: 'api__call',
        description: 'Make API call',
        inputSchema: {
          type: 'object',
          properties: {
            headers: {
              type: 'object',
              additionalProperties: { type: 'string' },
            },
            body: {
              type: 'object',
            },
          },
        },
      };

      const result = ToolSchemaMinimal.safeParse(validTool);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid tool objects', () => {
    it('should reject tool with empty name', () => {
      const invalidTool = {
        name: '',
        description: 'Valid description',
      };

      const result = ToolSchemaMinimal.safeParse(invalidTool);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be empty');
      }
    });

    it('should reject tool with missing name', () => {
      const invalidTool = {
        description: 'Valid description',
      };

      const result = ToolSchemaMinimal.safeParse(invalidTool);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should accept tool with empty description (description is optional)', () => {
      const validTool = {
        name: 'valid_name',
        description: '',
      };

      const result = ToolSchemaMinimal.safeParse(validTool);
      // Empty description is valid - description is optional
      expect(result.success).toBe(true);
    });

    it('should accept tool with missing description (description is optional)', () => {
      const validTool = {
        name: 'valid_name',
      };

      const result = ToolSchemaMinimal.safeParse(validTool);
      // Missing description is valid - description is optional
      expect(result.success).toBe(true);
    });

    it('should reject tool with non-string name', () => {
      const invalidTool = {
        name: 123,
        description: 'Valid description',
      };

      const result = ToolSchemaMinimal.safeParse(invalidTool);
      expect(result.success).toBe(false);
    });

    it('should accept tool with extra unknown fields (schema not strict)', () => {
      const validTool = {
        name: 'valid_name',
        description: 'Valid description',
        unknownField: 'will be ignored',
      };

      const result = ToolSchemaMinimal.safeParse(validTool);
      // ToolSchemaMinimal doesn't use .strict(), so extra fields are ignored
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Resource Schema Tests
// ============================================================================

describe('ResourceSchemaMinimal', () => {
  describe('valid resource objects', () => {
    it('should validate resource with required name and uri fields', () => {
      const validResource = {
        name: 'README',
        uri: 'file:///workspace/README.md',
      };

      const result = ResourceSchemaMinimal.safeParse(validResource);
      expect(result.success).toBe(true);
    });

    it('should validate resource with all optional fields', () => {
      const validResource = {
        uri: 'https://example.com/api/data',
        name: 'API Data',
        mimeType: 'application/json',
        description: 'External API resource',
      };

      const result = ResourceSchemaMinimal.safeParse(validResource);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('API Data');
        expect(result.data.mimeType).toBe('application/json');
        expect(result.data.description).toBe('External API resource');
      }
    });

    it('should validate resource with URI schemes (http, file, custom)', () => {
      const schemes = [
        { name: 'LocalFile', uri: 'file:///path/to/file' },
        { name: 'WebResource', uri: 'https://example.com/resource' },
        { name: 'CustomResource', uri: 'custom://namespace/resource' },
        { name: 'GitHubIssue', uri: 'github://owner/repo/issues/123' },
      ];

      schemes.forEach((resource) => {
        const result = ResourceSchemaMinimal.safeParse(resource);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('invalid resource objects', () => {
    it('should reject resource with empty uri', () => {
      const invalidResource = {
        name: 'ValidName',
        uri: '',
      };

      const result = ResourceSchemaMinimal.safeParse(invalidResource);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be empty');
      }
    });

    it('should reject resource with missing uri', () => {
      const invalidResource = {
        name: 'Valid name',
      };

      const result = ResourceSchemaMinimal.safeParse(invalidResource);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('uri');
      }
    });

    it('should reject resource with missing name field', () => {
      const invalidResource = {
        uri: 'file:///valid',
        unknownField: 'extra field',
      };

      const result = ResourceSchemaMinimal.safeParse(invalidResource);
      // Should fail because 'name' is required
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_type');
      }
    });
  });
});

// ============================================================================
// Resource Template Schema Tests
// ============================================================================

describe('ResourceTemplateSchemaMinimal', () => {
  describe('valid resource template objects', () => {
    it('should validate template with required name and uriTemplate', () => {
      const validTemplate = {
        name: 'FileTemplate',
        uriTemplate: 'file:///{path}',
      };

      const result = ResourceTemplateSchemaMinimal.safeParse(validTemplate);
      expect(result.success).toBe(true);
    });

    it('should validate template with all optional fields', () => {
      const validTemplate = {
        uriTemplate: 'github:///{owner}/{repo}/issues/{number}',
        name: 'GitHub Issue',
        description: 'GitHub issue resource template',
        mimeType: 'application/json',
      };

      const result = ResourceTemplateSchemaMinimal.safeParse(validTemplate);
      expect(result.success).toBe(true);
    });

    it('should validate template with complex URI patterns', () => {
      const patterns = [
        { name: 'FilePattern', uriTemplate: 'file:///{workspace}/{path}' },
        { name: 'APIPattern', uriTemplate: 'api:///{version}/{endpoint}' },
        { name: 'CustomPattern', uriTemplate: 'custom://{namespace}/{resource}/{id}' },
      ];

      patterns.forEach((template) => {
        const result = ResourceTemplateSchemaMinimal.safeParse(template);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('invalid resource template objects', () => {
    it('should reject template with empty uriTemplate', () => {
      const invalidTemplate = {
        name: 'ValidName',
        uriTemplate: '',
      };

      const result = ResourceTemplateSchemaMinimal.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be empty');
      }
    });

    it('should reject template with missing uriTemplate', () => {
      const invalidTemplate = {
        name: 'Valid name',
      };

      const result = ResourceTemplateSchemaMinimal.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('uriTemplate');
      }
    });
  });
});

// ============================================================================
// Prompt Argument Schema Tests
// ============================================================================

describe('PromptArgumentSchemaMinimal', () => {
  describe('valid prompt argument objects', () => {
    it('should validate required argument', () => {
      const validArg = {
        name: 'repository',
        required: true,
      };

      const result = PromptArgumentSchemaMinimal.safeParse(validArg);
      expect(result.success).toBe(true);
    });

    it('should validate optional argument with description', () => {
      const validArg = {
        name: 'branch',
        description: 'Git branch name',
        required: false,
      };

      const result = PromptArgumentSchemaMinimal.safeParse(validArg);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('Git branch name');
      }
    });
  });

  describe('invalid prompt argument objects', () => {
    it('should reject argument with empty name', () => {
      const invalidArg = {
        name: '',
        required: true,
      };

      const result = PromptArgumentSchemaMinimal.safeParse(invalidArg);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be empty');
      }
    });

    it('should accept argument with missing required field (required is optional)', () => {
      const validArg = {
        name: 'valid_name',
      };

      const result = PromptArgumentSchemaMinimal.safeParse(validArg);
      // 'required' field is optional in the schema
      expect(result.success).toBe(true);
    });

    it('should reject argument with non-boolean required field', () => {
      const invalidArg = {
        name: 'valid_name',
        required: 'true', // String instead of boolean
      };

      const result = PromptArgumentSchemaMinimal.safeParse(invalidArg);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Prompt Schema Tests
// ============================================================================

describe('PromptSchemaMinimal', () => {
  describe('valid prompt objects', () => {
    it('should validate prompt with only required name', () => {
      const validPrompt = {
        name: 'analyze-code',
      };

      const result = PromptSchemaMinimal.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });

    it('should validate prompt with description and arguments', () => {
      const validPrompt = {
        name: 'create-pr',
        description: 'Create GitHub pull request',
        arguments: [
          { name: 'title', description: 'PR title', required: true },
          { name: 'body', description: 'PR description', required: false },
        ],
      };

      const result = PromptSchemaMinimal.safeParse(validPrompt);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.arguments).toHaveLength(2);
      }
    });

    it('should validate prompt with empty arguments array', () => {
      const validPrompt = {
        name: 'simple-prompt',
        arguments: [],
      };

      const result = PromptSchemaMinimal.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid prompt objects', () => {
    it('should reject prompt with empty name', () => {
      const invalidPrompt = {
        name: '',
      };

      const result = PromptSchemaMinimal.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be empty');
      }
    });

    it('should reject prompt with missing name', () => {
      const invalidPrompt = {
        description: 'Valid description',
      };

      const result = PromptSchemaMinimal.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should accept prompt with arguments missing optional fields', () => {
      const validPrompt = {
        name: 'valid-name',
        arguments: [{ name: 'arg1' }], // 'required' is optional
      };

      const result = PromptSchemaMinimal.safeParse(validPrompt);
      // Arguments with just 'name' are valid since 'required' is optional
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Capabilities Container Schema Tests
// ============================================================================

describe('CapabilitiesSchema', () => {
  describe('valid capabilities objects', () => {
    it('should validate complete capabilities object', () => {
      const validCapabilities = {
        tools: [
          { name: 'search', description: 'Search tool' },
          { name: 'create', description: 'Create tool', inputSchema: {} },
        ],
        resources: [
          { uri: 'file:///README.md', name: 'README' },
        ],
        resourceTemplates: [
          { name: 'FileTemplate', uriTemplate: 'file:///{path}' },
        ],
        prompts: [
          { name: 'analyze', description: 'Analysis prompt' },
        ],
      };

      const result = CapabilitiesSchema.safeParse(validCapabilities);
      expect(result.success).toBe(true);
    });

    it('should provide default empty arrays for missing fields', () => {
      const minimalCapabilities = {};

      const result = CapabilitiesSchema.safeParse(minimalCapabilities);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tools).toEqual([]);
        expect(result.data.resources).toEqual([]);
        expect(result.data.resourceTemplates).toEqual([]);
        expect(result.data.prompts).toEqual([]);
      }
    });

    it('should validate capabilities with some empty arrays', () => {
      const partialCapabilities = {
        tools: [{ name: 'tool1', description: 'Tool 1' }],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      };

      const result = CapabilitiesSchema.safeParse(partialCapabilities);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid capabilities objects', () => {
    it('should reject capabilities with invalid tool', () => {
      const invalidCapabilities = {
        tools: [{ name: 'valid', description: 'valid' }, { name: '' }], // Invalid tool
        resources: [],
        resourceTemplates: [],
        prompts: [],
      };

      const result = CapabilitiesSchema.safeParse(invalidCapabilities);
      expect(result.success).toBe(false);
    });

    it('should reject capabilities with invalid resource', () => {
      const invalidCapabilities = {
        tools: [],
        resources: [{ uri: '' }], // Invalid URI
        resourceTemplates: [],
        prompts: [],
      };

      const result = CapabilitiesSchema.safeParse(invalidCapabilities);
      expect(result.success).toBe(false);
    });

    it('should reject capabilities with non-array fields', () => {
      const invalidCapabilities = {
        tools: 'not an array',
        resources: [],
        resourceTemplates: [],
        prompts: [],
      };

      const result = CapabilitiesSchema.safeParse(invalidCapabilities);
      expect(result.success).toBe(false);
    });

    it('should reject capabilities with extra unknown fields', () => {
      const invalidCapabilities = {
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
        unknownField: 'should fail',
      };

      const result = CapabilitiesSchema.safeParse(invalidCapabilities);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('unrecognized_keys');
      }
    });
  });

  describe('real-world backend response scenarios', () => {
    it('should validate typical MCP server response', () => {
      const realWorldResponse = {
        tools: [
          {
            name: 'github__create_issue',
            description: 'Create a new GitHub issue',
            inputSchema: {
              type: 'object',
              properties: {
                repository: { type: 'string' },
                title: { type: 'string' },
                body: { type: 'string' },
              },
              required: ['repository', 'title'],
            },
          },
          {
            name: 'github__search_repos',
            description: 'Search GitHub repositories',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                limit: { type: 'number' },
              },
            },
          },
        ],
        resources: [
          {
            uri: 'github://notifications',
            name: 'GitHub Notifications',
            mimeType: 'application/json',
          },
        ],
        resourceTemplates: [
          {
            uriTemplate: 'github://{owner}/{repo}/issues/{number}',
            name: 'GitHub Issue',
            mimeType: 'application/json',
          },
        ],
        prompts: [
          {
            name: 'analyze-pr',
            description: 'Analyze pull request for code quality',
            arguments: [
              { name: 'pr_number', description: 'PR number', required: true },
            ],
          },
        ],
      };

      const result = CapabilitiesSchema.safeParse(realWorldResponse);
      expect(result.success).toBe(true);
    });

    it('should handle server with no capabilities', () => {
      const emptyResponse = {
        tools: [],
        resources: [],
        resourceTemplates: [],
        prompts: [],
      };

      const result = CapabilitiesSchema.safeParse(emptyResponse);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Type Inference Tests
// ============================================================================

describe('TypeScript type inference', () => {
  it('should infer correct types from parsed data', () => {
    const capabilities = {
      tools: [{ name: 'test', description: 'Test tool' }],
      resources: [],
      resourceTemplates: [],
      prompts: [],
    };

    const result = CapabilitiesSchema.safeParse(capabilities);

    if (result.success) {
      // TypeScript should infer these types correctly
      const tool = result.data.tools[0];

      // These should not cause TypeScript errors
      const name: string = tool.name;
      const description: string = tool.description;
      const inputSchema: Record<string, unknown> | undefined = tool.inputSchema;

      expect(name).toBe('test');
      expect(description).toBe('Test tool');
      expect(inputSchema).toBeUndefined();
    }
  });
});
