#!/usr/bin/env node
/**
 * discover-schema-dependencies.ts
 * Recursively discovers all schema dependencies from an event schema by following allOf references
 *
 * This tool solves the problem of version mismatches where domains might reference different
 * versions of common profiles than their own version. For example, supplier-allocation 2025-12
 * might reference common 2025-11-draft in its allOf, and this tool will discover that dependency.
 *
 * Usage: node discover-schema-dependencies.ts <root-schema-path> <base-output-dir>
 *
 * Output: List of absolute paths to all discovered schema dependencies (one per line)
 */

import { parseArgs, handleCli } from './schema-discoverer-cli.ts';

// Parse and validate arguments
const parsedArgs = parseArgs(process.argv.slice(2));

if (!parsedArgs) {
  console.error('Usage: node discover-schema-dependencies.ts <root-schema-path> <base-output-dir>');
  console.error('');
  console.error('Discovers all schema dependencies by recursively following allOf references.');
  console.error('Outputs absolute paths to schema files in the output directory structure.');
  process.exit(1);
}

// Run CLI handler and exit with appropriate code
const exitCode = handleCli(parsedArgs);
process.exit(exitCode);
