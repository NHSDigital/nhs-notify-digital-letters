/**
 * CLI entry point for generating CloudEvents examples from JSON schemas
 *
 * This is the minimal entry point that delegates to the CLI handler.
 * The actual CLI logic is in generate-example-cli.ts for testability.
 */

import { handleCli } from "./generate-example-cli.ts";

// Run CLI handler and exit with appropriate code
handleCli(process.argv.slice(2)).then((result) => {
  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
});
