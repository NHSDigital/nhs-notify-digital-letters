/**
 * CLI handler for schema-discoverer
 *
 * Provides a testable CLI interface that can be called programmatically
 * Returns exit codes instead of calling process.exit()
 */

import type { CliArgs } from './schema-discoverer-types.ts';
import { SchemaDiscoverer } from './schema-discoverer.ts';

/**
 * Parse and validate CLI arguments
 * @param args Raw command line arguments (typically process.argv.slice(2))
 * @returns Parsed CLI arguments or null if invalid
 */
export function parseArgs(args: string[]): CliArgs | null {
  if (args.length < 2) {
    return null;
  }

  return {
    rootSchemaPath: args[0],
    baseOutputDir: args[1],
  };
}

/**
 * Handle CLI execution
 * @param args Parsed CLI arguments
 * @param output Output function (defaults to console.log)
 * @param errorOutput Error output function (defaults to console.error)
 * @returns Exit code (0 for success, 1 for error)
 */
export function handleCli(
  args: CliArgs,
  output: (message: string) => void = console.log,
  errorOutput: (message: string) => void = console.error
): number {
  const discoverer = new SchemaDiscoverer({
    baseOutputDir: args.baseOutputDir,
  });

  const result = discoverer.discover(args.rootSchemaPath);

  if (!result.success) {
    errorOutput(`Error: ${result.errorMessage}`);
    return 1;
  }

  // Convert to array and sort for consistent output
  const sortedDeps = Array.from(result.dependencies).sort();

  // Output each dependency on a new line (for easy consumption by make)
  for (const dep of sortedDeps) {
    output(dep);
  }

  return 0;
}
