import fs from 'fs/promises';
import JSON5 from 'json5';
import { ConfigError } from './errors.js';

export async function writeConfigToDisk(configManager, updatedConfig) {
  const targetPath = configManager?.configPaths?.[0];
  if (!targetPath) {
    throw new ConfigError('Config path unavailable for persistence');
  }

  const serialized = `${JSON.stringify(updatedConfig, null, 2)}\n`;
  await fs.writeFile(targetPath, serialized, 'utf8');
  await configManager.updateConfig(updatedConfig);
}

export async function loadRawConfig(configManager) {
  const targetPath = configManager?.configPaths?.[0];
  if (!targetPath) {
    throw new ConfigError('Config path unavailable for load');
  }

  const content = await fs.readFile(targetPath, 'utf8');
  return JSON5.parse(content);
}
