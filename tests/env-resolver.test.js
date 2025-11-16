import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EnvResolver, envResolver } from "../src/utils/env-resolver.js";
import { exec } from 'child_process';
import { promisify } from 'util';

// Define mock functions at module level BEFORE vi.mock() calls
const mockExecPromise = vi.fn();
const mockExec = vi.fn();

vi.mock('child_process', () => ({
  exec: mockExec,
  default: { exec: mockExec }  // Add default export for compatibility
}));

vi.mock('util', () => ({
  promisify: vi.fn().mockImplementation(() => mockExecPromise),
  default: { promisify: vi.fn().mockImplementation(() => mockExecPromise) }
}));

// Mock logger
vi.mock("../src/utils/logger.js", () => ({
  default: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("EnvResolver", () => {
  let resolver;
  let originalProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();

    // Store original process.env
    originalProcessEnv = process.env;

    // Setup fresh process.env for each test
    process.env = {
      NODE_ENV: 'test',
      TEST_VAR: 'test_value',
      API_KEY: 'secret_key',
      DATABASE_URL: 'postgres://localhost:5432/test'
    };

    // mockExecPromise is now hoisted, no need to redefine
    // Reset mock implementation for each test
    mockExecPromise.mockReset();

    // Create new resolver instance
    resolver = new EnvResolver();
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalProcessEnv;
  });

  describe("Constructor and Basic Setup", () => {
    it("should initialize with default options", () => {
      // ARRANGE: Create a new EnvResolver without options
      // ACT: Instantiate EnvResolver
      const newResolver = new EnvResolver();
      // ASSERT: Verify default configuration values
      expect(newResolver.maxPasses).toBe(10);
      expect(newResolver.commandTimeout).toBe(30000);
      expect(newResolver.strict).toBe(true); // Default to strict mode
    });

    it("should allow disabling strict mode", () => {
      // ARRANGE: Prepare options with strict mode disabled
      // ACT: Create EnvResolver with strict: false
      const newResolver = new EnvResolver({ strict: false });
      // ASSERT: Verify strict mode is disabled
      expect(newResolver.strict).toBe(false);
    });

    it("should export singleton instance with strict mode enabled", () => {
      // ARRANGE: Reference the exported singleton instance
      // ACT: Check the envResolver export
      // ASSERT: Verify it's an EnvResolver instance with strict mode enabled
      expect(envResolver).toBeInstanceOf(EnvResolver);
      expect(envResolver.strict).toBe(true);
    });
  });

  describe("Global Environment Support", () => {
    it("should parse global environment from MCP_HUB_ENV", () => {
      // ARRANGE: Set MCP_HUB_ENV with global variables JSON
      process.env.MCP_HUB_ENV = JSON.stringify({
        GLOBAL_VAR1: 'global_value1',
        GLOBAL_VAR2: 'global_value2'
      });
      // ACT: Parse global environment
      const globalEnv = resolver._parseGlobalEnv();
      // ASSERT: Verify parsed global environment matches input
      expect(globalEnv).toEqual({
        GLOBAL_VAR1: 'global_value1',
        GLOBAL_VAR2: 'global_value2'
      });
    });

    it("should return empty object when MCP_HUB_ENV is not set", () => {
      // ARRANGE: Ensure MCP_HUB_ENV is not set
      delete process.env.MCP_HUB_ENV;
      // ACT: Parse global environment
      const globalEnv = resolver._parseGlobalEnv();
      // ASSERT: Verify empty object is returned
      expect(globalEnv).toEqual({});
    });

    it("should handle invalid JSON in MCP_HUB_ENV gracefully", () => {
      // ARRANGE: Set MCP_HUB_ENV with invalid JSON
      process.env.MCP_HUB_ENV = 'invalid json';
      // ACT: Attempt to parse global environment
      const globalEnv = resolver._parseGlobalEnv();
      // ASSERT: Verify graceful handling returns empty object
      expect(globalEnv).toEqual({});
    });

    it("should include global env in context with correct priority", async () => {
      // ARRANGE: Set MCP_HUB_ENV with global variables and create config with overlapping keys
      process.env.MCP_HUB_ENV = JSON.stringify({
        GLOBAL_VAR: 'global_value',
        SHARED_VAR: 'from_global'
      });
      const config = {
        env: {
          SERVER_VAR: 'server_value',
          SHARED_VAR: 'from_server'  // Should override global
        }
      };
      // ACT: Resolve configuration with global and server env
      const result = await resolver.resolveConfig(config, ['env']);
      // ASSERT: Verify correct priority - server variables override global
      expect(result.env.GLOBAL_VAR).toBe('global_value');    // From global
      expect(result.env.SERVER_VAR).toBe('server_value');    // From server
      expect(result.env.SHARED_VAR).toBe('from_server');     // Server overrides global
    });

    it("should make global env available for placeholder resolution", async () => {
      // ARRANGE: Set global environment variables in MCP_HUB_ENV and config with placeholders
      process.env.MCP_HUB_ENV = JSON.stringify({
        BASE_URL: 'https://api.example.com',
        TOKEN: 'global_token'
      });
      const config = {
        url: "${BASE_URL}/v1",
        headers: {
          "Authorization": "Bearer ${TOKEN}"
        }
      };
      // ACT: Resolve configuration with global env placeholders
      const result = await resolver.resolveConfig(config, ['url', 'headers']);
      // ASSERT: Verify global environment variables are substituted in placeholders
      expect(result.url).toBe('https://api.example.com/v1');
      expect(result.headers.Authorization).toBe('Bearer global_token');
    });

    it("should work when no server env is specified", async () => {
      // ARRANGE: Set global environment and config without server env field
      process.env.MCP_HUB_ENV = JSON.stringify({
        GLOBAL_VAR1: 'value1',
        GLOBAL_VAR2: 'value2'
      });
      const config = {
        url: "${GLOBAL_VAR1}",
        command: "server-${GLOBAL_VAR2}"
      };
      // ACT: Resolve configuration using only global environment
      const result = await resolver.resolveConfig(config, ['url', 'command']);
      // ASSERT: Verify global env is used and placeholders resolved
      expect(result.env).toEqual({
        GLOBAL_VAR1: 'value1',
        GLOBAL_VAR2: 'value2'
      });
      expect(result.url).toBe('value1');
      expect(result.command).toBe('server-value2');
    });
  });

  describe("String Placeholder Resolution", () => {
    it("should resolve simple environment variables", async () => {
      // ARRANGE: Create context with known variables
      const context = { TEST_VAR: 'resolved_value', API_KEY: 'secret' };
      // ACT: Resolve strings with simple variable placeholders
      const result = await resolver._resolveStringWithPlaceholders("${TEST_VAR}", context);
      const result2 = await resolver._resolveStringWithPlaceholders("Bearer ${API_KEY}", context);
      // ASSERT: Verify environment variables are properly substituted
      expect(result).toBe("resolved_value");
      expect(result2).toBe("Bearer secret");
    });

    it("should handle multiple placeholders in one string", async () => {
      // ARRANGE: Set up context with multiple variables
      const context = { HOST: 'localhost', PORT: '3000', DB: 'myapp' };
      // ACT: Resolve string with multiple variable placeholders
      const result = await resolver._resolveStringWithPlaceholders(
        "postgresql://${HOST}:${PORT}/${DB}",
        context
      );
      // ASSERT: Verify all placeholders are substituted correctly
      expect(result).toBe("postgresql://localhost:3000/myapp");
    });

    it("should keep unresolved placeholders intact in non-strict mode", async () => {
      // ARRANGE: Create non-strict resolver and context with missing variable
      const nonStrictResolver = new EnvResolver({ strict: false });
      const context = { KNOWN_VAR: 'known' };
      // ACT: Resolve string with unknown placeholder in non-strict mode
      const result = await nonStrictResolver._resolveStringWithPlaceholders(
        "${KNOWN_VAR} and ${UNKNOWN_VAR}",
        context
      );
      // ASSERT: Verify known variables resolved, unknown kept as-is
      expect(result).toBe("known and ${UNKNOWN_VAR}");
    });

    it("should throw error on unresolved placeholders in strict mode", async () => {
      // ARRANGE: Create strict resolver with incomplete context
      const context = { KNOWN_VAR: 'known' };
      // ACT: Attempt to resolve string with unknown placeholder in strict mode
      // ASSERT: Verify error is thrown for unresolved variable
      await expect(resolver._resolveStringWithPlaceholders(
        "${KNOWN_VAR} and ${UNKNOWN_VAR}",
        context
      )).rejects.toThrow("Variable 'UNKNOWN_VAR' not found");
    });

    it("should execute commands in placeholders", async () => {
      // ARRANGE: Mock command execution to return secret value
      mockExecPromise.mockResolvedValueOnce({ stdout: "secret_value\n" });
      const context = {};
      // ACT: Resolve string with command placeholder
      const result = await resolver._resolveStringWithPlaceholders(
        "Bearer ${cmd: op read secret}",
        context
      );
      // ASSERT: Verify command was executed and result substituted
      expect(mockExecPromise).toHaveBeenCalledWith(
        "op read secret",
        expect.objectContaining({ timeout: 30000 })
      );
      expect(result).toBe("Bearer secret_value");
    });

    it("should handle mixed environment variables and commands", async () => {
      // ARRANGE: Mock command execution and set up context with variables
      mockExecPromise.mockResolvedValueOnce({ stdout: "cmd_result\n" });
      const context = { ENV_VAR: 'env_value' };
      // ACT: Resolve string with both variable and command placeholders
      const result = await resolver._resolveStringWithPlaceholders(
        "${ENV_VAR}-${cmd: echo test}",
        context
      );
      // ASSERT: Verify both variable and command are resolved
      expect(result).toBe("env_value-cmd_result");
    });
  });

  describe("Nested Placeholder Resolution", () => {
    it("should resolve nested environment variables inside command placeholders", async () => {
      // ARRANGE: Mock command execution and set up context with command parts
      mockExecPromise.mockResolvedValueOnce({ stdout: "nested_cmd_result\n" });
      const context = {
        COMMAND: "echo",
        ARGUMENT: "nested_cmd_result"
      };
      // ACT: Resolve string with nested variables inside command
      const result = await resolver._resolveStringWithPlaceholders(
        "Data: ${cmd: ${COMMAND} ${ARGUMENT}}",
        context
      );
      // ASSERT: Verify command with substituted variables is executed
      expect(mockExecPromise).toHaveBeenCalledWith(
        "echo nested_cmd_result",
        expect.any(Object)
      );
      expect(result).toBe("Data: nested_cmd_result");
    });

    it("should handle complex nested command and variable placeholders", async () => {
      // ARRANGE: Mock command execution and set up context with nested variables
      mockExecPromise.mockResolvedValueOnce({ stdout: "obsidian-token" });
      const context = {
        TEST: 'hello',
        XDG_RUNTIME_DIR: '/run/user/1000'
      };
      // ACT: Resolve complex string with multiple nested placeholder types
      const result = await resolver._resolveStringWithPlaceholders(
        "TOKEN ${TEST} ${cmd: cat ${XDG_RUNTIME_DIR}/agenix/mcp-obsidian-token} ${TEST}",
        context
      );
      // ASSERT: Verify all nested placeholders resolved correctly
      expect(mockExecPromise).toHaveBeenCalledWith(
        "cat /run/user/1000/agenix/mcp-obsidian-token",
        expect.any(Object)
      );
      expect(result).toBe("TOKEN hello obsidian-token hello");
    });

    it("should throw error on unresolved nested placeholders in strict mode", async () => {
      // ARRANGE: Set up strict resolver with incomplete context
      const context = {
        KNOWN_VAR: 'known'
      };
      // ACT: Attempt to resolve command with unknown nested variable
      // ASSERT: Verify error is thrown for unresolved nested variable
      await expect(resolver._resolveStringWithPlaceholders(
        "Data: ${cmd: echo ${UNKNOWN_VAR}}",
        context
      )).rejects.toThrow("Variable 'UNKNOWN_VAR' not found");
    });

    it("should keep unresolved nested placeholders in non-strict mode by executing command with literal", async () => {
      // ARRANGE: Set up non-strict resolver with incomplete context and mock command
      const nonStrictResolver = new EnvResolver({ strict: false });
      const context = { KNOWN_VAR: 'known' };
      mockExecPromise.mockResolvedValueOnce({ stdout: "${UNKNOWN_VAR}\n" });
      // ACT: Resolve command with unknown nested variable in non-strict mode
      const result = await nonStrictResolver._resolveStringWithPlaceholders(
        "Data: ${cmd: echo ${UNKNOWN_VAR}} and ${KNOWN_VAR}",
        context
      );
      // ASSERT: Verify unknown variable passed to command, known variable resolved
      expect(mockExecPromise).toHaveBeenCalledWith(
        "echo ${UNKNOWN_VAR}",
        expect.any(Object)
      );
      expect(result).toBe("Data: ${UNKNOWN_VAR} and known");
    });
  });

  describe("Command Execution", () => {
    describe("Command Execution", () => {
      it("should execute ${cmd: ...} commands via _executeCommand", async () => {
        // ARRANGE: Mock command execution with result
        mockExecPromise.mockResolvedValueOnce({ stdout: "secret_value\n" });
        // ACT: Execute command via _executeCommand method
        const result = await resolver._executeCommand("${cmd: op read secret}");
        // ASSERT: Verify command was called with correct parameters and result returned
        expect(mockExecPromise).toHaveBeenCalledWith(
          "op read secret",
          expect.objectContaining({ timeout: 30000, encoding: 'utf8' })
        );
        expect(result).toBe("secret_value");
      });

      it("should execute command content directly via _executeCommandContent", async () => {
        // ARRANGE: Mock command execution with result
        mockExecPromise.mockResolvedValueOnce({ stdout: "direct_result\n" });
        // ACT: Execute command content directly
        const result = await resolver._executeCommandContent("cmd: echo direct");
        // ASSERT: Verify command was executed with correct parameters
        expect(mockExecPromise).toHaveBeenCalledWith(
          "echo direct",
          expect.objectContaining({ timeout: 30000, encoding: 'utf8' })
        );
        expect(result).toBe("direct_result");
      });

      it("should handle command execution errors", async () => {
        // ARRANGE: Mock command execution failure
        const error = new Error("Command failed");
        mockExecPromise.mockRejectedValueOnce(error);
        // ACT: Attempt to execute failing command
        // ASSERT: Verify error is propagated
        await expect(resolver._executeCommand("${cmd: failing-command}"))
          .rejects.toThrow("Command failed");
      });

      it("should handle empty commands", async () => {
        // ARRANGE: Create command strings with empty content
        // ACT & ASSERT: Verify empty commands throw errors
        await expect(resolver._executeCommand("${cmd: }"))
          .rejects.toThrow("Empty command in cmd:");

        await expect(resolver._executeCommandContent("cmd: "))
          .rejects.toThrow("Empty command in cmd:");
      });

      it("should support legacy $: syntax with deprecation warning", async () => {
        // ARRANGE: Mock command execution for legacy syntax
        mockExecPromise.mockResolvedValueOnce({ stdout: "legacy_output\n" });
        // ACT: Execute command using legacy $: syntax
        const result = await resolver._executeCommand("$: echo legacy");
        // ASSERT: Verify legacy syntax still works
        expect(mockExecPromise).toHaveBeenCalledWith(
          "echo legacy",
          expect.objectContaining({ timeout: 30000, encoding: 'utf8' })
        );
        expect(result).toBe("legacy_output");
      });

      it("should throw error for invalid command syntax", async () => {
        // ARRANGE: Create command with invalid syntax
        // ACT & ASSERT: Verify invalid syntax throws error
        await expect(resolver._executeCommand("invalid: command"))
          .rejects.toThrow("Invalid command syntax: invalid: command");
      });
    });

    describe("Configuration Resolution", () => {
      it("should resolve env field with null fallbacks", async () => {
        // ARRANGE: Set fallback variable in process.env and config with null value
        process.env.FALLBACK_VAR = 'fallback_value';
        const config = {
          env: {
            SIMPLE_VAR: "${TEST_VAR}",
            FALLBACK_VAR: null,
            STATIC_VAR: "static_value"
          }
        };
        // ACT: Resolve config with null fallbacks
        const result = await resolver.resolveConfig(config, ['env']);
        // ASSERT: Verify null values fall back to process.env
        expect(result.env.SIMPLE_VAR).toBe('test_value');
        expect(result.env.FALLBACK_VAR).toBe('fallback_value'); // null falls back to process.env
        expect(result.env.STATIC_VAR).toBe('static_value');
        // Cleanup
        delete process.env.FALLBACK_VAR;
      });

      it("should resolve args field with legacy syntax", async () => {
        // ARRANGE: Create config with legacy $VAR syntax in args
        const config = {
          env: { TOKEN: 'secret123' },
          args: [
            "--token", "${TOKEN}",
            "--legacy", "$API_KEY",  // Legacy syntax
            "--static", "value"
          ]
        };
        // ACT: Resolve configuration with both modern and legacy syntax
        const result = await resolver.resolveConfig(config, ['env', 'args']);
        // ASSERT: Verify all arguments resolved correctly
        expect(result.args).toEqual([
          "--token", "secret123",
          "--legacy", "secret_key",  // From process.env.API_KEY
          "--static", "value"
        ]);
      });

      it("should resolve headers field", async () => {
        // ARRANGE: Mock command execution and set up config with headers containing placeholders
        mockExecPromise.mockResolvedValueOnce({ stdout: "auth_token\n" });
        const config = {
          headers: {
            "Authorization": "Bearer ${cmd: get-token}",
            "X-Custom": "${API_KEY}",
            "Static": "value"
          }
        };
        // ACT: Resolve configuration with headers
        const result = await resolver.resolveConfig(config, ['headers']);
        // ASSERT: Verify all headers are resolved
        expect(result.headers).toEqual({
          "Authorization": "Bearer auth_token",
          "X-Custom": "secret_key",
          "Static": "value"
        });
      });

      it("should resolve url and command fields", async () => {
        // ARRANGE: Create config with url and command containing placeholders
        const config = {
          url: "https://${API_KEY}.example.com",
          command: "${TEST_VAR}/bin/server"
        };
        // ACT: Resolve url and command fields
        const result = await resolver.resolveConfig(config, ['url', 'command']);
        // ASSERT: Verify fields are resolved with substituted values
        expect(result.url).toBe("https://secret_key.example.com");
        expect(result.command).toBe("test_value/bin/server");
      });

      it("should resolve env field with placeholders", async () => {
        // ARRANGE: Set up process.env and config with env-to-env references
        process.env.FIRST = "value1";
        const config = {
          env: {
            FIRST: "value1",
            SECOND: "${FIRST}_extended"
          }
        };
        // ACT: Resolve config with env field containing references
        const result = await resolver.resolveConfig(config, ['env']);
        // ASSERT: Verify environment variables reference each other correctly
        expect(result.env.FIRST).toBe('value1');
        expect(result.env.SECOND).toBe('value1_extended'); // Uses process.env.FIRST
        // Cleanup
        delete process.env.FIRST;
      });

      it("should handle commands in env providing context for other fields", async () => {
        // ARRANGE: Mock command execution and config with env command
        mockExecPromise.mockResolvedValueOnce({ stdout: "secret_from_cmd\n" });
        const config = {
          env: {
            SECRET: "${cmd: get-secret}"
          },
          headers: {
            "Authorization": "Bearer ${SECRET}"
          }
        };
        // ACT: Resolve config with env command providing context
        const result = await resolver.resolveConfig(config, ['env', 'headers']);
        // ASSERT: Verify env command result used in other fields
        expect(result.env.SECRET).toBe('secret_from_cmd');
        expect(result.headers.Authorization).toBe('Bearer secret_from_cmd');
      });

      it("should work without env field for remote servers", async () => {
        // ARRANGE: Mock command execution for remote server config without env field
        mockExecPromise.mockResolvedValueOnce({ stdout: "remote_token\n" });
        const config = {
          url: "https://api.example.com",
          headers: {
            "Authorization": "Bearer ${cmd: get-remote-token}"
          }
        };
        // ACT: Resolve remote server config without env
        const result = await resolver.resolveConfig(config, ['url', 'headers']);
        // ASSERT: Verify remote config resolved correctly
        expect(result.url).toBe('https://api.example.com');
        expect(result.headers.Authorization).toBe('Bearer remote_token');
      });

      it("should handle circular dependencies gracefully in non-strict mode", async () => {
        // ARRANGE: Create non-strict resolver and config with circular dependencies
        const nonStrictResolver = new EnvResolver({ strict: false });
        const config = {
          env: {
            VAR_A: "${VAR_B}",
            VAR_B: "${VAR_A}"
          }
        };
        // ACT: Resolve config with circular dependencies
        const result = await nonStrictResolver.resolveConfig(config, ['env']);
        // ASSERT: Verify circular dependencies handled gracefully
        expect(result.env.VAR_A).toBe('${VAR_B}');
        expect(result.env.VAR_B).toBe('${VAR_A}');
      });

      describe("Error Handling", () => {
        describe("Strict Mode (Default)", () => {
          it("should throw error on command execution failures", async () => {
            // ARRANGE: Mock command failure and config with failing command
            mockExecPromise.mockRejectedValueOnce(new Error("Command failed"));
            const config = {
              headers: {
                "Authorization": "Bearer ${cmd: failing-command}"
              }
            };
            // ACT: Attempt to resolve config with failing command
            // ASSERT: Verify error is thrown for command failure
            await expect(resolver.resolveConfig(config, ['headers']))
              .rejects.toThrow("cmd execution failed: Command failed");
          });

          it("should throw error on unresolved environment variables", async () => {
            // ARRANGE: Create config with unknown variable
            const config = {
              env: {
                SIMPLE_VAR: "${UNKNOWN_VAR}"
              }
            };
            // ACT: Attempt to resolve config with unknown variable
            // ASSERT: Verify error is thrown for unresolved variable
            await expect(resolver.resolveConfig(config, ['env']))
              .rejects.toThrow("Variable 'UNKNOWN_VAR' not found");
          });

          it("should throw error on legacy syntax with missing variables", async () => {
            // ARRANGE: Create config with legacy syntax referencing unknown variable
            const config = {
              args: ["--token", "$UNKNOWN_LEGACY_VAR"]
            };
            // ACT: Attempt to resolve config with unknown legacy variable
            // ASSERT: Verify error is thrown for missing legacy variable
            await expect(resolver.resolveConfig(config, ['args']))
              .rejects.toThrow("Legacy variable 'UNKNOWN_LEGACY_VAR' not found");
          });

          it("should detect circular dependencies eventually", async () => {
            // ARRANGE: Create non-strict resolver with circular dependency chain
            const nonStrictResolver = new EnvResolver({ strict: false });
            const config = {
              env: {
                VAR_A: "${VAR_B}",
                VAR_B: "${VAR_C}",
                VAR_C: "${VAR_A}"
              }
            };
            // ACT: Resolve config with circular dependencies in non-strict mode
            const result = await nonStrictResolver.resolveConfig(config, ['env']);
            // ASSERT: Verify circular dependencies detected and values left as-is
            expect(result.env.VAR_A).toBe('${VAR_B}');
            expect(result.env.VAR_B).toBe('${VAR_C}');
            expect(result.env.VAR_C).toBe('${VAR_A}');
          });

          it("should throw error on mixed placeholders with failures", async () => {
            // ARRANGE: Create config with mixed known and unknown variables
            const config = {
              url: "https://${KNOWN_VAR}.${UNKNOWN_VAR}.com"
            };
            const context = { KNOWN_VAR: 'api' };
            process.env.KNOWN_VAR = 'api';
            // ACT: Attempt to resolve config with mixed placeholders
            // ASSERT: Verify error thrown for unknown variable
            await expect(resolver.resolveConfig(config, ['url']))
              .rejects.toThrow("Variable 'UNKNOWN_VAR' not found");
          });
        });
      })

      describe("Non-Strict Mode", () => {
        beforeEach(() => {
          resolver = new EnvResolver({ strict: false });
        });

        it("should handle command execution failures gracefully", async () => {
          // ARRANGE: Set non-strict resolver, mock command failure
          mockExecPromise.mockRejectedValueOnce(new Error("Command failed"));
          const config = {
            headers: {
              "Authorization": "Bearer ${cmd: failing-command}"
            }
          };
          // ACT: Resolve config with failing command in non-strict mode
          const result = await resolver.resolveConfig(config, ['headers']);
          // ASSERT: Verify original placeholder kept on failure
          expect(result.headers.Authorization).toBe('Bearer ${cmd: failing-command}');
        });

        it("should handle unresolved variables gracefully", async () => {
          // ARRANGE: Create non-strict resolver with config containing unknown variable
          const config = {
            env: {
              SIMPLE_VAR: "${UNKNOWN_VAR}",
              KNOWN_VAR: "${TEST_VAR}"
            }
          };
          // ACT: Resolve config with mixed known and unknown variables
          const result = await resolver.resolveConfig(config, ['env']);
          // ASSERT: Verify known resolved, unknown kept as-is
          expect(result.env.SIMPLE_VAR).toBe('${UNKNOWN_VAR}'); // Keep original
          expect(result.env.KNOWN_VAR).toBe('test_value'); // Resolved
        });

        it("should handle circular dependencies gracefully", async () => {
          // ARRANGE: Create non-strict resolver config with circular dependencies
          const config = {
            env: {
              VAR_A: "${VAR_B}",
              VAR_B: "${VAR_A}"
            }
          };
          // ACT: Resolve config with circular dependency
          const result = await resolver.resolveConfig(config, ['env']);
          // ASSERT: Verify circular dependencies detected, values left as-is
          expect(result.env.VAR_A).toBe('${VAR_B}');
          expect(result.env.VAR_B).toBe('${VAR_A}');
        });
      });

      describe("General Error Handling", () => {
        it("should handle non-string values gracefully", async () => {
          // ARRANGE: Create non-strict resolver with config containing non-string values
          const nonStrictResolver = new EnvResolver({ strict: false });
          const config = {
            env: {
              NUMBER: 123,
              BOOLEAN: true,
              NULL_VAL: null
            },
            args: ["string", 456, true]
          };
          // ACT: Resolve config with mixed value types
          const result = await nonStrictResolver.resolveConfig(config, ['env', 'args']);
          // ASSERT: Verify non-string values handled correctly
          expect(result.env.NUMBER).toBe(123);
          expect(result.env.BOOLEAN).toBe(true);
          expect(result.env.NULL_VAL).toBe(''); // null with no fallback in non-strict mode
          expect(result.args).toEqual(["string", 456, true]);
        });

        it("should provide clear error messages with context", async () => {
          // ARRANGE: Create config with missing variable in headers
          const config = {
            headers: {
              "Authorization": "Bearer ${MISSING_TOKEN}"
            }
          };
          // ACT: Attempt to resolve config in strict mode
          // ASSERT: Verify error message is clear and includes variable name
          await expect(resolver.resolveConfig(config, ['headers']))
            .rejects.toThrow(/Variable.*MISSING_TOKEN.*not found/);
        });
      });
    });

    describe("VS Code Compatibility", () => {
      beforeEach(() => {
        // Clear any existing global env
        delete process.env.MCP_HUB_ENV;
      });

      describe("Predefined Variables", () => {
        it("should resolve VS Code predefined variables", async () => {
          // ARRANGE: Create config using VS Code predefined variables
          const config = {
            url: "${workspaceFolder}/api",
            command: "${userHome}/bin/server",
            cwd: "${workspaceFolder}",
            args: ["--config", "${workspaceFolder}/config.json"]
          };
          // ACT: Resolve config with predefined variables
          const result = await resolver.resolveConfig(config, ['url', 'command', 'cwd', 'args']);
          // ASSERT: Verify predefined variables substituted with correct values
          const expectedCwd = process.cwd();
          const expectedHome = require('os').homedir();
          expect(result.url).toBe(`${expectedCwd}/api`);
          expect(result.command).toBe(`${expectedHome}/bin/server`);
          expect(result.cwd).toBe(expectedCwd);
          expect(result.args).toEqual(["--config", `${expectedCwd}/config.json`]);
        });

        it("should support workspaceFolderBasename variable", async () => {
          // ARRANGE: Create config using workspaceFolderBasename variable
          const config = {
            env: {
              PROJECT_NAME: "${workspaceFolderBasename}"
            }
          };
          // ACT: Resolve config with workspaceFolderBasename
          const result = await resolver.resolveConfig(config, ['env']);
          // ASSERT: Verify predefined variable substituted correctly
          const expectedBasename = require('path').basename(process.cwd());
          expect(result.env.PROJECT_NAME).toBe(expectedBasename);
        });

        it("should support pathSeparator variable", async () => {
          // ARRANGE: Create config using pathSeparator variables
          const config = {
            env: {
              PATH_SEP: "${pathSeparator}",
              PATH_SEP_SHORT: "${/}"  // VS Code shorthand
            }
          };
          // ACT: Resolve config with path separator variables
          const result = await resolver.resolveConfig(config, ['env']);
          // ASSERT: Verify path separator resolved correctly
          const expectedSep = require('path').sep;
          expect(result.env.PATH_SEP).toBe(expectedSep);
          expect(result.env.PATH_SEP_SHORT).toBe(expectedSep);
        });

        it("should have correct priority - predefined vars should not override process.env", async () => {
          // ARRANGE: Set process.env variable that could conflict with predefined vars
          process.env.workspaceFolder = '/custom/workspace';
          const config = {
            env: {
              WORKSPACE: "${workspaceFolder}"
            }
          };
          // ACT: Resolve config with priority conflict
          const result = await resolver.resolveConfig(config, ['env']);
          // ASSERT: Verify process.env takes priority over predefined vars
          expect(result.env.WORKSPACE).toBe('/custom/workspace');
          // Cleanup
          delete process.env.workspaceFolder;
        });
      });

      describe("VS Code env: syntax", () => {
        it("should resolve ${env:VARIABLE} syntax", async () => {
          // ARRANGE: Set VS Code style env variables
          process.env.VS_CODE_VAR = 'vscode_value';
          const config = {
            env: {
              STANDARD: "${API_KEY}",        // Standard syntax
              VS_CODE: "${env:VS_CODE_VAR}"  // VS Code syntax
            },
            headers: {
              "Authorization": "Bearer ${env:API_KEY}"
            }
          };
          // ACT: Resolve config with both standard and VS Code syntax
          const result = await resolver.resolveConfig(config, ['env', 'headers']);
          // ASSERT: Verify both syntaxes work correctly
          expect(result.env.STANDARD).toBe('secret_key');
          expect(result.env.VS_CODE).toBe('vscode_value');
          expect(result.headers.Authorization).toBe('Bearer secret_key');
          // Cleanup
          delete process.env.VS_CODE_VAR;
        });

        it("should handle unresolved ${env:} variables in strict mode", async () => {
          // ARRANGE: Create config with unknown env variable
          const config = {
            env: {
              MISSING: "${env:UNKNOWN_VAR}"
            }
          };
          // ACT: Attempt to resolve config with unknown env variable
          // ASSERT: Verify error thrown in strict mode
          await expect(resolver.resolveConfig(config, ['env']))
            .rejects.toThrow("Variable 'UNKNOWN_VAR' not found");
        });

        it("should handle unresolved ${env:} variables in non-strict mode", async () => {
          // ARRANGE: Create non-strict resolver with config containing unknown env variable
          const nonStrictResolver = new EnvResolver({ strict: false });
          const config = {
            env: {
              MISSING: "${env:UNKNOWN_VAR}",
              KNOWN: "${env:API_KEY}"
            }
          };
          // ACT: Resolve config in non-strict mode with mixed variables
          const result = await nonStrictResolver.resolveConfig(config, ['env']);
          // ASSERT: Verify known variables resolved, unknown kept as-is
          expect(result.env.MISSING).toBe('${env:UNKNOWN_VAR}');
          expect(result.env.KNOWN).toBe('secret_key');
        });
      });

      describe("VS Code input: variables via MCP_HUB_ENV", () => {
        it("should resolve ${input:} variables from MCP_HUB_ENV", async () => {
          // ARRANGE: Set MCP_HUB_ENV with input variables
          process.env.MCP_HUB_ENV = JSON.stringify({
            'input:api-key': 'secret-from-input',
            'input:database-url': 'postgresql://localhost/test'
          });
          const config = {
            env: {
              API_KEY: "${input:api-key}",
              DB_URL: "${input:database-url}"
            },
            headers: {
              "Authorization": "Bearer ${input:api-key}"
            }
          };
          // ACT: Resolve config with input variables
          const result = await resolver.resolveConfig(config, ['env', 'headers']);
          // ASSERT: Verify input variables resolved from MCP_HUB_ENV
          expect(result.env.API_KEY).toBe('secret-from-input');
          expect(result.env.DB_URL).toBe('postgresql://localhost/test');
          expect(result.headers.Authorization).toBe('Bearer secret-from-input');
        });

        it("should handle missing ${input:} variables gracefully", async () => {
          // ARRANGE: Set MCP_HUB_ENV with some input variables
          process.env.MCP_HUB_ENV = JSON.stringify({
            'input:known-key': 'known-value'
          });
          const nonStrictResolver = new EnvResolver({ strict: false });
          const config = {
            env: {
              KNOWN: "${input:known-key}",
              MISSING: "${input:missing-key}"
            }
          };
          // ACT: Resolve config in non-strict mode with missing input variable
          const result = await nonStrictResolver.resolveConfig(config, ['env']);
          // ASSERT: Verify known resolved, missing kept as-is
          expect(result.env.KNOWN).toBe('known-value');
          expect(result.env.MISSING).toBe('${input:missing-key}'); // Kept as-is
        });

        it("should throw error for missing ${input:} variables in strict mode", async () => {
          // ARRANGE: Set MCP_HUB_ENV with some input variables
          process.env.MCP_HUB_ENV = JSON.stringify({
            'input:known-key': 'known-value'
          });
          const config = {
            env: {
              MISSING: "${input:missing-key}"
            }
          };
          // ACT: Attempt to resolve config with missing input variable
          // ASSERT: Verify error thrown in strict mode
          await expect(resolver.resolveConfig(config, ['env']))
            .rejects.toThrow("Variable 'input:missing-key' not found");
        });
      });

      describe("Complete VS Code scenario", () => {
        it("should handle a complete VS Code-style configuration", async () => {
          // ARRANGE: Set up comprehensive VS Code-style configuration
          process.env.MCP_HUB_ENV = JSON.stringify({
            'input:perplexity-key': 'pplx-secret-key',
            'input:github-token': 'ghp_github_token'
          });
          process.env.NODE_ENV = 'production';
          const config = {
            env: {
              // VS Code input variables
              PERPLEXITY_API_KEY: "${input:perplexity-key}",
              GITHUB_TOKEN: "${input:github-token}",
              // VS Code env syntax
              NODE_ENVIRONMENT: "${env:NODE_ENV}",
              // VS Code predefined variables
              WORKSPACE_PATH: "${workspaceFolder}",
              USER_HOME: "${userHome}",
              // Mixed syntax
              CONFIG_PATH: "${workspaceFolder}/config/${env:NODE_ENV}.json"
            },
            args: [
              "--workspace", "${workspaceFolder}",
              "--token", "${input:perplexity-key}",
              "--env", "${env:NODE_ENV}"
            ],
            headers: {
              "Authorization": "Bearer ${input:github-token}",
              "X-Workspace": "${workspaceFolderBasename}"
            }
          };
          // ACT: Resolve complete VS Code-style configuration
          const result = await resolver.resolveConfig(config, ['env', 'args', 'headers']);
          // ASSERT: Verify all variable types resolved correctly
          expect(result.env.PERPLEXITY_API_KEY).toBe('pplx-secret-key');
          expect(result.env.GITHUB_TOKEN).toBe('ghp_github_token');
          expect(result.env.NODE_ENVIRONMENT).toBe('production');
          expect(result.env.WORKSPACE_PATH).toBe(process.cwd());
          expect(result.env.USER_HOME).toBe(require('os').homedir());
          expect(result.env.CONFIG_PATH).toBe(`${process.cwd()}/config/production.json`);
          expect(result.args).toEqual([
            "--workspace", process.cwd(),
            "--token", "pplx-secret-key",
            "--env", "production"
          ]);
          expect(result.headers.Authorization).toBe('Bearer ghp_github_token');
          expect(result.headers['X-Workspace']).toBe(require('path').basename(process.cwd()));
          // Cleanup
          delete process.env.NODE_ENV;
        });

        it("should not pass predefined variables to server env", async () => {
          // ARRANGE: Set global env and config with predefined variable references
          process.env.MCP_HUB_ENV = JSON.stringify({
            'GLOBAL_VAR': 'global_value'
          });
          const config = {
            env: {
              SERVER_VAR: "server_value",
              WORKSPACE_REF: "${workspaceFolder}"
            }
          };
          // ACT: Resolve config
          const result = await resolver.resolveConfig(config, ['env']);
          // ASSERT: Verify predefined variables not in server env, only resolved
          expect(result.env).toEqual({
            GLOBAL_VAR: 'global_value',        // From MCP_HUB_ENV
            SERVER_VAR: 'server_value',        // From server config
            WORKSPACE_REF: process.cwd()       // Resolved predefined var
          });
          // Predefined variables themselves should NOT be in server env
          expect(result.env.workspaceFolder).toBeUndefined();
          expect(result.env.userHome).toBeUndefined();
          expect(result.env.pathSeparator).toBeUndefined();
        });
      });
    });
  });
});
