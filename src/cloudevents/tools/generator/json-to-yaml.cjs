#!/usr/bin/env node

/**
 * Entry point for JSON to YAML conversion tool
 *
 * This is a slim entry point that delegates to the TypeScript implementation.
 * The actual conversion logic is in json-to-yaml-converter.ts and json-to-yaml-cli.ts.
 *
 * Usage: node json-to-yaml.cjs <input.json> <output.yaml>
 */

const { handleCli } = require('./json-to-yaml-cli.ts');
const { JsonToYamlConverter } = require('./json-to-yaml-converter.ts');

// Legacy export for backward compatibility (used by tests)
function convertJsonToYaml(inputFile, outputFile) {
  const converter = new JsonToYamlConverter();
  const result = converter.convert(inputFile, outputFile);
  return result.success;
}

// Run if called directly
if (require.main === module) {
  const exitCode = handleCli(process.argv.slice(2));
  process.exit(exitCode);
}

module.exports = { convertJsonToYaml };
