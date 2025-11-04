#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { startServer } from "../server.js";
import logger from "./logger.js";
import { readFileSync, existsSync } from 'fs';
import "./errors.js";
import { fileURLToPath } from "url";
import { join } from "path";

// Load .env file if it exists
function loadEnvFile() {
  const envPath = join(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      
      const match = trimmedLine.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Don't override existing environment variables
        if (!process.env[key]) {
          // Remove surrounding quotes if present
          let cleanValue = value.trim();
          if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) || 
              (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
            cleanValue = cleanValue.slice(1, -1);
          }
          process.env[key] = cleanValue;
        }
      }
    }
    logger.debug(`Loaded environment variables from ${envPath}`);
  }
}

// Load .env file early, before any other processing
loadEnvFile();

// Read version from package.json while in dev mode to get the latest version
// In production, VERSION will be injected at build time via esbuild define
let VERSION;
if (process.env.NODE_ENV != "production") {
  // Get the directory path of the current module
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  // Navigate up two directories to find package.json
  const pkgPath = join(__dirname, '..', '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  VERSION = pkg.version;
} else {
  // In production, use the version defined at build time
  VERSION = process.env.VERSION || "v0.0.0";
}

// Custom failure handler for yargs
function handleParseError(msg, err) {
  // Ensure CLI parsing errors exit immediately with proper code
  logger.error(
    "CLI_ARGS_ERROR",
    "Failed to parse command line arguments",
    {
      message: msg || "Missing required arguments",
      help: "Use --help to see usage information",
      error: err?.message,
    },
    true,
    1
  ); // Add exit:true and exitCode:1
}


async function run() {
  const argv = yargs(hideBin(process.argv))
    .usage("Usage: mcp-hub [options]")
    .version(VERSION || "v0.0.0")
    .options({
      port: {
        alias: "p",
        describe: "Port to run the server on",
        type: "number",
        demandOption: true,
      },
      config: {
        alias: "c",
        describe: "Path to config file(s). Can be specified multiple times. Merged in order.",
        type: "array",
        demandOption: true,
      },
      watch: {
        alias: "w",
        describe: "Watch for config file changes",
        type: "boolean",
        default: false,
      },
      "auto-shutdown": {
        describe: "Whether to automatically shutdown when no clients are connected",
        type: "boolean",
        default: false
      },
      "shutdown-delay": {
        describe:
          "Delay in milliseconds before shutting down when auto-shutdown is enabled and no clients are connected",
        type: "number",
        default: 0,
      },
    })
    .example("mcp-hub --port 3000 --config ./global.json --config ./project.json")
    .help("h")
    .alias("h", "help")
    .fail(handleParseError).argv;

  try {
    await startServer({
      port: argv.port,
      config: argv.config, // This will now be an array of paths
      watch: argv.watch,
      autoShutdown: argv["auto-shutdown"],
      shutdownDelay: argv["shutdown-delay"],
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1)
  }
}

run()
