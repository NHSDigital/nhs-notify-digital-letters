/**
 * CLI handler for render-readme
 *
 * This module contains the testable CLI logic for the render-readme tool.
 * It can be imported and tested separately from the entry point.
 */

import { ReadmeRenderer } from "./readme-renderer.ts";

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
 * CLI handler that renders README from index
 *
 * @param rootDir - Root directory of the project (typically __dirname/../../../)
 * @returns CLI result with exit code
 */
export function handleCli(rootDir: string): CliResult {
  try {
    const renderer = new ReadmeRenderer({
      rootDir: rootDir,
      verbose: true,
    });

    renderer.render();

    return { exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error:", message);
    if (message.includes("Index file not found")) {
      console.error("💡 Run generate-readme-index.cjs first");
    }
    return { exitCode: 1, error: message };
  }
}
