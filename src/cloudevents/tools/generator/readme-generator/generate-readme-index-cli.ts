/**
 * CLI handler for generate-readme-index
 *
 * This module contains the testable CLI logic for the generate-readme-index tool.
 * It can be imported and tested separately from the entry point.
 */

import * as path from "path";
import { ReadmeIndexGenerator } from "./readme-index-generator.ts";

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
 * CLI handler that processes command-line arguments and generates the index
 *
 * @param args - Command line arguments (typically process.argv.slice(2))
 * @param rootDir - Root directory of the project (typically __dirname/../../../)
 * @returns CLI result with exit code
 */
export function handleCli(args: string[], rootDir: string): CliResult {
  try {
    // Get docs base path from command line args (optional)
    const docsBasePath = args[0];

    // Create generator with appropriate options
    const options: any = {
      rootDir: rootDir,
      verbose: true,
    };

    // Override docs directory if provided
    if (docsBasePath) {
      options.docsDir = path.resolve(rootDir, docsBasePath);
    }

    const generator = new ReadmeIndexGenerator(options);
    generator.generateToFile();

    return { exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error:", message);
    return { exitCode: 1, error: message };
  }
}
