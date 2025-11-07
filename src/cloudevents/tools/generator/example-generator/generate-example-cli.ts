/**
 * CLI handler for generate-example
 *
 * This module contains the testable CLI logic for the generate-example tool.
 * It can be imported and tested separately from the entry point.
 */

import { ExampleGenerator } from "./example-generator.ts";
import { clearCache, displayCacheInfo } from "../../cache/schema-cache.ts";

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
  if (args[0] === "--clear-cache") {
    clearCache();
    return { exitCode: 0 };
  }

  if (args[0] === "--cache-info") {
    displayCacheInfo();
    return { exitCode: 0 };
  }

  // Validate arguments
  const [schemaPathRaw, outputPath] = args;
  if (!schemaPathRaw || !outputPath) {
    const errorMsg = [
      "Usage: ts-node generate-example.ts <schema.json|yaml> <output.json>",
      "       ts-node generate-example.ts --clear-cache",
      "       ts-node generate-example.ts --cache-info",
      "",
      "Environment variables:",
      "  SCHEMA_CACHE_DIR - Custom cache directory (default: system tmp)"
    ].join("\n");

    console.error(errorMsg);
    return { exitCode: 1, error: "Missing required arguments" };
  }

  // Create generator instance and generate example
  const generator = new ExampleGenerator({ verbose: true });
  const success = await generator.generateToFile(schemaPathRaw, outputPath);

  return success ? { exitCode: 0 } : { exitCode: 1, error: "Generation failed" };
}
