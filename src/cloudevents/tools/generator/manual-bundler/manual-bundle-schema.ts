#!/usr/bin/env node
/**
 * CLI entry point for manual schema bundling
 *
 * Delegates all logic to handleCli for testability
 */

import { handleCli } from './manual-bundle-schema-cli.ts';

async function main(): Promise<void> {
  const result = await handleCli(process.argv.slice(2));
  process.exit(result.exitCode);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
