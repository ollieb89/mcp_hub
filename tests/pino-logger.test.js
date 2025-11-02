import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PinoLogger } from '../src/utils/pino-logger.js';
import { EventEmitter } from 'events';

describe('PinoLogger', () => {
  let logger;
  let mockSSEManager;

  beforeEach(() => {
    // Create mock SSE manager
    mockSSEManager = {
      broadcast: vi.fn()
    };

    // Create logger instance
    logger = new PinoLogger({
      logLevel: 'debug',
      enableFileLogging: false // Disable file logging for tests
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('API Compatibility', () => {
    it('should have all required methods', () => {
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.logUpdate).toBeDefined();
      expect(logger.logCapabilityChange).toBeDefined();
      expect(logger.setLogLevel).toBeDefined();
      expect(logger.setFileLogging).toBeDefined();
      expect(logger.setSseManager).toBeDefined();
    });

    it('should have all required properties', () => {
      expect(logger.logLevel).toBe('debug');
      expect(logger.logFile).toBeDefined();
      expect(logger.enableFileLogging).toBe(false);
      expect(logger.LOG_LEVELS).toEqual({
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
      });
    });

    it('should accept info() calls with message and data', () => {
      expect(() => {
        logger.info('Test message', { key: 'value' });
      }).not.toThrow();
    });

    it('should accept warn() calls with message and data', () => {
      expect(() => {
        logger.warn('Warning message', { warning: true });
      }).not.toThrow();
    });

    it('should accept debug() calls with message and data', () => {
      expect(() => {
        logger.debug('Debug message', { debug: 'data' });
      }).not.toThrow();
    });

    it('should accept error() calls with code, message, data, and exit flag', () => {
      const exitSpy = vi.spyOn(process, 'emit');

      expect(() => {
        logger.error('ERROR_CODE', 'Error message', { error: true }, false);
      }).not.toThrow();

      expect(exitSpy).not.toHaveBeenCalledWith('SIGTERM');
      exitSpy.mockRestore();
    });

    it('should emit SIGTERM when error() called with exit=true', () => {
      const exitSpy = vi.spyOn(process, 'emit');

      logger.error('ERROR_CODE', 'Fatal error', {}, true);

      expect(exitSpy).toHaveBeenCalledWith('SIGTERM');
      exitSpy.mockRestore();
    });

    it('should not emit SIGTERM when error() called with exit=false', () => {
      const exitSpy = vi.spyOn(process, 'emit');

      logger.error('ERROR_CODE', 'Non-fatal error', {}, false);

      expect(exitSpy).not.toHaveBeenCalledWith('SIGTERM');
      exitSpy.mockRestore();
    });
  });

  describe('Special Methods', () => {
    it('should call logUpdate() with metadata', () => {
      expect(() => {
        logger.logUpdate({ status: 'updated', server: 'test' });
      }).not.toThrow();
    });

    it('should call logCapabilityChange() with type, serverName, and data', () => {
      expect(() => {
        logger.logCapabilityChange('TOOL', 'test-server', { count: 5 });
      }).not.toThrow();
    });
  });

  describe('Log Level Management', () => {
    it('should change log level with setLogLevel()', () => {
      logger.setLogLevel('error');
      expect(logger.logLevel).toBe('error');
      expect(logger._pino.level).toBe('error');
    });

    it('should ignore invalid log levels', () => {
      const originalLevel = logger.logLevel;
      logger.setLogLevel('invalid');
      expect(logger.logLevel).toBe(originalLevel);
    });

    it('should accept all valid log levels', () => {
      const validLevels = ['error', 'warn', 'info', 'debug'];

      validLevels.forEach(level => {
        logger.setLogLevel(level);
        expect(logger.logLevel).toBe(level);
      });
    });
  });

  describe('File Logging Control', () => {
    it('should toggle file logging with setFileLogging()', () => {
      logger.setFileLogging(true);
      expect(logger.enableFileLogging).toBe(true);

      logger.setFileLogging(false);
      expect(logger.enableFileLogging).toBe(false);
    });
  });

  describe('SSE Integration', () => {
    it('should set SSE manager with setSseManager()', () => {
      logger.setSseManager(mockSSEManager);
      expect(logger._sseManager).toBe(mockSSEManager);
    });

    it('should reinitialize Pino when SSE manager is set', () => {
      const reinitSpy = vi.spyOn(logger, '_reinitializePino');
      logger.setSseManager(mockSSEManager);
      expect(reinitSpy).toHaveBeenCalled();
      reinitSpy.mockRestore();
    });
  });

  describe('Legacy Compatibility', () => {
    it('should have file() method for API compatibility', () => {
      expect(logger.file).toBeDefined();
      expect(() => {
        logger.file('test message');
      }).not.toThrow();
    });

    it('should have log() method for API compatibility', () => {
      expect(logger.log).toBeDefined();
      expect(() => {
        logger.log('info', 'test message', {}, null, {});
      }).not.toThrow();
    });

    it('should handle log() method with all parameters', () => {
      const exitSpy = vi.spyOn(process, 'emit');

      logger.log('error', 'Error message', { key: 'value' }, 'ERROR_CODE', { exit: false });
      expect(exitSpy).not.toHaveBeenCalled();

      exitSpy.mockRestore();
    });
  });

  describe('Constructor Options', () => {
    it('should use default options when not provided', () => {
      const defaultLogger = new PinoLogger();

      expect(defaultLogger.logLevel).toBe('info');
      expect(defaultLogger.enableFileLogging).toBe(true);
      expect(defaultLogger._sseManager).toBe(null);
    });

    it('should accept custom logLevel', () => {
      const customLogger = new PinoLogger({ logLevel: 'warn' });
      expect(customLogger.logLevel).toBe('warn');
    });

    it('should accept custom logFile path', () => {
      const customPath = '/custom/path/test.log';
      const customLogger = new PinoLogger({
        logFile: customPath,
        enableFileLogging: false // Disable file logging to prevent ENOENT error
      });
      expect(customLogger.logFile).toBe(customPath);
    });

    it('should respect enableFileLogging option', () => {
      const noFileLogger = new PinoLogger({ enableFileLogging: false });
      expect(noFileLogger.enableFileLogging).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should setup error handlers without throwing (static method)', () => {
      expect(() => {
        PinoLogger.setupErrorHandlers();
      }).not.toThrow();
    });

    it('should setup error handlers only once', () => {
      // Reset the flag
      PinoLogger._errorHandlersSetup = false;

      PinoLogger.setupErrorHandlers();
      expect(PinoLogger._errorHandlersSetup).toBe(true);

      // Calling again should not throw
      expect(() => {
        PinoLogger.setupErrorHandlers();
      }).not.toThrow();
    });

    it('should prevent multiple error handler registrations', () => {
      // Reset the flag
      PinoLogger._errorHandlersSetup = false;

      const listenersBefore = process.stdout.listenerCount('error');
      PinoLogger.setupErrorHandlers();
      const listenersAfter1 = process.stdout.listenerCount('error');

      // Second call should not add more listeners
      PinoLogger.setupErrorHandlers();
      const listenersAfter2 = process.stdout.listenerCount('error');

      expect(listenersAfter1).toBeGreaterThan(listenersBefore);
      expect(listenersAfter2).toBe(listenersAfter1); // No additional listeners
    });
  });
});
