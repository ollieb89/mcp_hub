/**
 * Process Mocking Template
 * 
 * Use this template for testing CLI tools, process spawning, and process lifecycle.
 * Based on Sprint 4 CLI testing patterns.
 * 
 * Key Patterns:
 * - vi.waitFor() for async process validation (no throws from mockExit)
 * - Process cleanup and zombie prevention
 * - Environment variable injection
 * - STDIO communication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';

/**
 * Test Suite: [Component] - Process Lifecycle
 * 
 * Focus: Testing process spawning, communication, and cleanup
 * Pattern: Sprint 4 CLI/process testing approach
 */
describe('[Component] - Process Lifecycle', () => {
  let mockProcess;
  let mockExit;
  let originalExit;
  let originalArgv;

  beforeEach(() => {
    // ARRANGE: Mock process.exit WITHOUT throwing
    // Sprint 4 Pattern: No throw, just track calls
    mockExit = vi.fn();
    originalExit = process.exit;
    process.exit = mockExit;

    // Save original argv
    originalArgv = process.argv;
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore process.exit
    process.exit = originalExit;
    
    // Restore argv
    process.argv = originalArgv;
    
    // Cleanup any spawned processes
    if (mockProcess && !mockProcess.killed) {
      mockProcess.kill();
    }
    
    vi.restoreAllMocks();
  });

  /**
   * Test Group: Process Exit Handling
   * Sprint 4 Pattern: vi.waitFor() for async exit validation
   */
  describe('Process Exit Handling', () => {
    
    it('should exit with code 1 when required argument missing', async () => {
      // ARRANGE: Set argv without required argument
      process.argv = ['node', 'cli.js'];
      
      // ACT: Run CLI (simulated)
      // yourCli.run();
      
      // ASSERT: Wait for exit call with vi.waitFor() (Sprint 4 pattern)
      await vi.waitFor(() => {
        expect(mockExit).toHaveBeenCalled();
      }, { timeout: 1000 });
      
      // Verify exit code
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should exit with code 0 on successful completion', async () => {
      // ARRANGE: Set valid argv
      process.argv = ['node', 'cli.js', '--arg', 'value'];
      
      // ACT: Run CLI successfully
      // await yourCli.run();
      
      // ASSERT: Wait for successful exit
      await vi.waitFor(() => {
        expect(mockExit).toHaveBeenCalledWith(0);
      }, { timeout: 1000 });
    });

    it('should not throw from process.exit mock', async () => {
      // ARRANGE: Setup error condition
      process.argv = ['node', 'cli.js'];
      
      // ACT & ASSERT: Should not throw, just track exit
      await expect(async () => {
        // yourCli.run();
        await vi.waitFor(() => expect(mockExit).toHaveBeenCalled());
      }).resolves.not.toThrow();
    });
  });

  /**
   * Test Group: Process Spawning
   * Testing child_process.spawn patterns
   */
  describe('Process Spawning', () => {
    
    it('should spawn process with correct command and args', async () => {
      // ARRANGE: Spy on spawn
      const spawnSpy = vi.spyOn(require('child_process'), 'spawn');
      const expectedCommand = 'node';
      const expectedArgs = ['server.js', '--port', '3000'];
      
      // ACT: Spawn process
      mockProcess = spawn(expectedCommand, expectedArgs);
      
      // ASSERT: Verify spawn called correctly
      expect(spawnSpy).toHaveBeenCalledWith(
        expectedCommand,
        expectedArgs,
        expect.any(Object)
      );
      
      // Cleanup
      mockProcess.kill();
      spawnSpy.mockRestore();
    });

    it('should inject environment variables into spawned process', async () => {
      // ARRANGE: Prepare env vars
      const customEnv = {
        ...process.env,
        CUSTOM_VAR: 'test-value',
        API_KEY: 'secret-key'
      };
      
      // ACT: Spawn with custom env
      mockProcess = spawn('node', ['server.js'], { env: customEnv });
      
      // ASSERT: Process receives correct environment
      // Note: Actual env verification would need process inspection
      expect(mockProcess).toBeDefined();
      expect(mockProcess.killed).toBe(false);
      
      // Cleanup
      mockProcess.kill();
    });

    it('should handle process spawn errors', async () => {
      // ARRANGE: Try to spawn non-existent command
      const errorHandler = vi.fn();
      
      // ACT: Spawn invalid process
      mockProcess = spawn('nonexistent-command', []);
      mockProcess.on('error', errorHandler);
      
      // ASSERT: Wait for error event
      await vi.waitFor(() => {
        expect(errorHandler).toHaveBeenCalled();
      }, { timeout: 2000 });
      
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.stringContaining('ENOENT')
        })
      );
    });
  });

  /**
   * Test Group: STDIO Communication
   * Testing stdin/stdout/stderr handling
   */
  describe('STDIO Communication', () => {
    
    it('should read stdout from spawned process', async () => {
      // ARRANGE: Spawn process that writes to stdout
      mockProcess = spawn('echo', ['test output']);
      const stdoutChunks = [];
      
      // ACT: Collect stdout data
      mockProcess.stdout.on('data', (chunk) => {
        stdoutChunks.push(chunk.toString());
      });
      
      // ASSERT: Wait for data
      await vi.waitFor(() => {
        expect(stdoutChunks.length).toBeGreaterThan(0);
      }, { timeout: 1000 });
      
      expect(stdoutChunks.join('')).toContain('test output');
    });

    it('should write to stdin of spawned process', async () => {
      // ARRANGE: Spawn process that reads stdin (e.g., cat)
      mockProcess = spawn('cat');
      const outputChunks = [];
      
      mockProcess.stdout.on('data', (chunk) => {
        outputChunks.push(chunk.toString());
      });
      
      // ACT: Write to stdin
      mockProcess.stdin.write('test input\n');
      mockProcess.stdin.end();
      
      // ASSERT: Verify output
      await vi.waitFor(() => {
        expect(outputChunks.length).toBeGreaterThan(0);
      }, { timeout: 1000 });
      
      expect(outputChunks.join('')).toContain('test input');
      
      // Cleanup
      mockProcess.kill();
    });

    it('should handle stderr output', async () => {
      // ARRANGE: Spawn process that writes to stderr
      mockProcess = spawn('node', ['-e', 'console.error("error message")']);
      const stderrChunks = [];
      
      // ACT: Collect stderr data
      mockProcess.stderr.on('data', (chunk) => {
        stderrChunks.push(chunk.toString());
      });
      
      // ASSERT: Wait for stderr
      await vi.waitFor(() => {
        expect(stderrChunks.length).toBeGreaterThan(0);
      }, { timeout: 1000 });
      
      expect(stderrChunks.join('')).toContain('error message');
    });
  });

  /**
   * Test Group: Process Cleanup
   * Preventing zombie processes and resource leaks
   */
  describe('Process Cleanup', () => {
    
    it('should kill spawned process on cleanup', async () => {
      // ARRANGE: Spawn long-running process
      mockProcess = spawn('sleep', ['10']);
      const killSpy = vi.spyOn(mockProcess, 'kill');
      
      // ACT: Kill process
      mockProcess.kill();
      
      // ASSERT: Verify kill called
      expect(killSpy).toHaveBeenCalled();
      
      // Wait for process to actually exit
      await vi.waitFor(() => {
        expect(mockProcess.killed).toBe(true);
      }, { timeout: 1000 });
    });

    it('should handle SIGTERM gracefully', async () => {
      // ARRANGE: Spawn process and setup exit handler
      mockProcess = spawn('sleep', ['10']);
      const exitHandler = vi.fn();
      mockProcess.on('exit', exitHandler);
      
      // ACT: Send SIGTERM
      mockProcess.kill('SIGTERM');
      
      // ASSERT: Wait for exit
      await vi.waitFor(() => {
        expect(exitHandler).toHaveBeenCalled();
      }, { timeout: 2000 });
      
      expect(exitHandler).toHaveBeenCalledWith(
        expect.any(Number),
        'SIGTERM'
      );
    });

    it('should force kill with SIGKILL if SIGTERM fails', async () => {
      // ARRANGE: Spawn stubborn process
      mockProcess = spawn('sleep', ['10']);
      const exitHandler = vi.fn();
      mockProcess.on('exit', exitHandler);
      
      // ACT: Try SIGTERM, then SIGKILL
      mockProcess.kill('SIGTERM');
      
      // Wait briefly
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force kill
      mockProcess.kill('SIGKILL');
      
      // ASSERT: Process eventually exits
      await vi.waitFor(() => {
        expect(exitHandler).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should remove all event listeners on cleanup', async () => {
      // ARRANGE: Spawn process and add listeners
      mockProcess = spawn('echo', ['test']);
      const dataHandler = vi.fn();
      const errorHandler = vi.fn();
      
      mockProcess.stdout.on('data', dataHandler);
      mockProcess.on('error', errorHandler);
      
      // ACT: Remove all listeners
      mockProcess.stdout.removeAllListeners();
      mockProcess.removeAllListeners();
      mockProcess.kill();
      
      // ASSERT: Verify cleanup
      expect(mockProcess.stdout.listenerCount('data')).toBe(0);
      expect(mockProcess.listenerCount('error')).toBe(0);
    });
  });

  /**
   * Test Group: Argument Parsing
   * Testing CLI argument handling
   */
  describe('Argument Parsing', () => {
    
    it('should parse required flags correctly', () => {
      // ARRANGE: Set argv with flags
      process.argv = ['node', 'cli.js', '--port', '3000', '--config', 'test.json'];
      
      // ACT: Parse arguments (simulated)
      const args = {
        port: '3000',
        config: 'test.json'
      };
      
      // ASSERT: Verify parsed values
      expect(args.port).toBe('3000');
      expect(args.config).toBe('test.json');
    });

    it('should handle flag aliases', () => {
      // ARRANGE: Use short flag aliases
      process.argv = ['node', 'cli.js', '-p', '3000', '-c', 'test.json'];
      
      // ACT: Parse with aliases
      const args = {
        port: '3000',
        config: 'test.json'
      };
      
      // ASSERT: Aliases resolve to full names
      expect(args.port).toBe('3000');
      expect(args.config).toBe('test.json');
    });

    it('should provide default values for optional flags', () => {
      // ARRANGE: Argv without optional flags
      process.argv = ['node', 'cli.js', '--port', '3000'];
      
      // ACT: Parse with defaults
      const args = {
        port: '3000',
        watch: false, // default
        'auto-shutdown': false // default
      };
      
      // ASSERT: Defaults applied
      expect(args.watch).toBe(false);
      expect(args['auto-shutdown']).toBe(false);
    });
  });
});

/**
 * Sprint 4 Process Testing Patterns Summary:
 * 
 * 1. ✅ Process.exit Mocking:
 *    - Use vi.fn() WITHOUT throw
 *    - Use vi.waitFor() to wait for exit call
 *    - Verify exit code after wait completes
 * 
 * 2. ✅ Process Cleanup:
 *    - Always kill spawned processes in afterEach
 *    - Remove event listeners to prevent leaks
 *    - Use SIGTERM first, SIGKILL as fallback
 * 
 * 3. ✅ STDIO Handling:
 *    - Collect stdout/stderr chunks
 *    - Use vi.waitFor() for async data arrival
 *    - Write to stdin for interactive testing
 * 
 * 4. ✅ Environment Injection:
 *    - Pass custom env to spawn options
 *    - Merge with process.env when needed
 *    - Test env variable resolution
 * 
 * 5. ✅ Error Handling:
 *    - Listen for 'error' event
 *    - Wait for error with vi.waitFor()
 *    - Verify error codes (ENOENT, etc.)
 */
