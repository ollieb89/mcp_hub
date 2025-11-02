import { Writable } from 'stream';

/**
 * Creates a custom Pino transport that broadcasts log entries to SSEManager
 *
 * This transport maintains compatibility with the legacy Logger's SSE broadcast format
 * while integrating with Pino's multistream architecture.
 *
 * @param {SSEManager} sseManager - SSE manager instance for broadcasting logs
 * @returns {Object} Stream configuration for pino.multistream()
 */
export function createSSETransport(sseManager) {
  return {
    level: 'debug',
    stream: new Writable({
      write(chunk, encoding, callback) {
        try {
          const log = JSON.parse(chunk.toString());

          if (sseManager) {
            // Map Pino levels (10-60) to legacy Logger levels
            // 60 = fatal, 50 = error, 40 = warn, 30 = info, 20 = debug, 10 = trace
            let type;
            if (log.level >= 50) {
              type = 'error';
            } else if (log.level >= 40) {
              type = 'warn';
            } else if (log.level >= 30) {
              type = 'info';
            } else {
              type = 'debug';
            }

            // Construct log entry in legacy format for SSE broadcast
            const entry = {
              type,
              message: log.msg || '',
              data: {
                ...log,
                // Remove Pino-specific fields to match legacy format
                level: undefined,
                time: undefined,
                pid: undefined,
                hostname: undefined,
                msg: undefined
              },
              timestamp: new Date(log.time).toISOString(),
              ...(log.code && { code: log.code })
            };

            // Remove undefined fields
            Object.keys(entry.data).forEach(key => {
              if (entry.data[key] === undefined) {
                delete entry.data[key];
              }
            });

            sseManager.broadcast('log', entry);
          }

          callback();
        } catch (err) {
          // Don't fail the entire logging system on SSE errors
          callback();
        }
      }
    })
  };
}
