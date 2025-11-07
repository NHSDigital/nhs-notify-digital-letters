/**
 * CLI handler for manual-bundle-schema
 *
 * This module contains the testable CLI logic for the manual-bundle-schema tool.
 * It can be imported and tested separately from the entry point.
 */

import path from 'path';
import type { BundleResult } from './schema-bundler-types.ts';
import { SchemaBundler } from './schema-bundler.ts';
import { clearCache, displayCacheInfo } from '../../cache/schema-cache.ts';

/**
 * Result of CLI execution
 */
export interface CliResult {
  /** Exit code (0 for success, non-zero for error) */
  exitCode: number;
  /** Error message if any */
  error?: string;
}

/**
 * CLI handler that processes command-line arguments and executes the appropriate action
 *
 * @param args - Command line arguments (typically process.argv.slice(2))
 * @returns Promise resolving to CLI result with exit code
 */
export async function handleCli(args: string[]): Promise<CliResult> {
  // Handle cache management commands
  if (args[0] === '--clear-cache') {
    clearCache();
    return { exitCode: 0 };
  }

  if (args[0] === '--cache-info') {
    displayCacheInfo();
    return { exitCode: 0 };
  }

  // Parse arguments
  let flatten = false;
  let rootDir: string | undefined;
  let baseUrl: string | undefined;
  const filtered: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--flatten' || a === '--flatten-allof') {
      flatten = true;
    } else if (a === '--root-dir' && i + 1 < args.length) {
      rootDir = args[i + 1];
      i++;
    } else if (a === '--base-url' && i + 1 < args.length) {
      baseUrl = args[i + 1];
      i++;
    } else {
      filtered.push(a);
    }
  }

  const [entry, outFile] = filtered;

  // Validate arguments
  if (!entry || !outFile) {
    const errorMsg = [
      'Usage: ts-node manual-bundle-schema.ts [--flatten] [--root-dir <path>] [--base-url <url>] <entry-schema> <output-file>',
      '       ts-node manual-bundle-schema.ts --clear-cache',
      '       ts-node manual-bundle-schema.ts --cache-info',
      '',
      'Environment variables:',
      '  SCHEMA_CACHE_DIR - Custom cache directory (default: system tmp)'
    ].join('\n');

    console.error(errorMsg);
    return { exitCode: 1, error: 'Missing required arguments' };
  }

  // Create bundler and process schema
  const bundler = new SchemaBundler({
    flatten,
    rootDir,
    baseUrl,
    verbose: true
  });

  const success = await bundler.bundleToFile(entry, outFile);

  return success ? { exitCode: 0 } : { exitCode: 1, error: 'Bundling failed' };
}
