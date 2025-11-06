#!/usr/bin/env ts-node
/**
 * CLI wrapper for JSON Schema validation
 *
 * This file provides the command-line interface for the Validator class.
 * For programmatic usage, import and use the Validator class directly.
 */

import { parseCliArgs, determineSchemaDir } from './validator-lib.ts';
import { Validator } from './validator.ts';

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  // Parse command line arguments
  const args: string[] = process.argv.slice(2);
  const { schemaPath, dataPath, baseDir } = parseCliArgs(args);

  // Validate arguments
  if (!schemaPath || !dataPath) {
    console.error(
      "Usage: validate.ts [--base <base-dir>] <schema.json|yaml> <data.json>"
    );
    console.error(
      "  --base: Base directory for resolving schema references (default: auto-detect 'src' or schema directory)"
    );
    process.exit(1);
  }

  // Determine schema directory
  const schemaDir: string = baseDir ? baseDir : determineSchemaDir(schemaPath);

  // Create validator and validate
  const validator = new Validator({ schemaDir });
  const result = await validator.validate(schemaPath, dataPath);

  // Handle result and exit
  if (result.valid) {
    console.log("Valid!");
    process.exit(0);
  } else {
    console.error("Invalid:", result.errors);
    if (result.formattedErrors) {
      console.error(result.formattedErrors);
    }
    process.exit(1);
  }
}

// Run main function and handle errors
main().catch((err: Error) => {
  console.error("Validation error:", err.message);
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
