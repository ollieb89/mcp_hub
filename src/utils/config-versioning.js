import crypto from 'crypto';

/**
 * Compute a version hash for config tracking
 * @param {Object} config - Configuration object
 * @returns {string} SHA-256 hash of config
 */
export function computeConfigVersion(config) {
  const serialized = JSON.stringify(config, Object.keys(config).sort());
  return crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 16);
}

/**
 * Verify if proposed config matches expected version
 * @param {Object} currentConfig - Current configuration
 * @param {string} expectedVersion - Expected version hash
 * @returns {boolean} True if versions match
 */
export function verifyConfigVersion(currentConfig, expectedVersion) {
  const currentVersion = computeConfigVersion(currentConfig);
  return currentVersion === expectedVersion;
}

/**
 * Create a versioned config response
 * @param {Object} config - Configuration object
 * @returns {Object} Config with version metadata
 */
export function createVersionedResponse(config) {
  return {
    config,
    version: computeConfigVersion(config),
    timestamp: new Date().toISOString(),
  };
}
