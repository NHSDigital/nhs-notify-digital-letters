#!/usr/bin/env ts-node

/**
 * CLI handler for json-to-yaml conversion
 *
 * This module provides the command-line interface logic for converting JSON files to YAML.
 * It handles argument parsing, file validation, and error reporting.
 */

import fs from 'fs';
import { JsonToYamlConverter } from './json-to-yaml-converter.ts';

/**
 * Handle CLI arguments and execute the conversion
 *
 * @param args - Command-line arguments (typically process.argv.slice(2))
 * @returns Exit code (0 for success, 1 for failure)
 */
export function handleCli(args: string[]): number {
  // Validate argument count
  if (args.length !== 2) {
    console.error('Usage: ts-node json-to-yaml-cli.ts <input.json> <output.yaml>');
    return 1;
  }

  const [inputFile, outputFile] = args;

  // Validate input file exists
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    return 1;
  }

  // Perform conversion
  const converter = new JsonToYamlConverter();
  const result = converter.convert(inputFile, outputFile);

  if (!result.success) {
    console.error(`Error converting ${inputFile}:`, result.error);
    return 1;
  }

  return 0;
}

// Export for use as a module
export default handleCli;
