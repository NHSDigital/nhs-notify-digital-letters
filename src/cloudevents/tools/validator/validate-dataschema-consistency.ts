#!/usr/bin/env tsx
/**
 * CLI script to validate dataschema consistency across CloudEvents event schemas
 */

import path from 'path';
import { validateDataschemaConsistency } from './dataschema-consistency-lib';
import { findAllSchemaFiles, loadSchemaFile } from './validator-lib';

/**
 * Main entry point for the validation script
 */
export async function main(args: string[]): Promise<number> {
  // Default to current directory if no args provided
  const searchDirs = args.length > 0 ? args : [process.cwd()];

  console.log('✓ Validating event schemas...');

  // Find all schema files
  const allSchemaFiles: string[] = [];
  for (const dir of searchDirs) {
    const files = findAllSchemaFiles(dir);
    allSchemaFiles.push(...files);
  }

  if (allSchemaFiles.length === 0) {
    console.log('✓ No schema files found');
    return 0;
  }

  console.log(`✓ Found ${allSchemaFiles.length} schema files`);

  // Validate each schema
  const errors: Array<{ file: string; error: string }> = [];

  for (const filePath of allSchemaFiles) {
    const schema = loadSchemaFile(filePath);

    if (!schema) {
      // Skip files that can't be loaded (not valid JSON/YAML)
      continue;
    }

    const result = validateDataschemaConsistency(schema);

    if (!result.valid) {
      const relativePath = path.relative(process.cwd(), filePath);
      errors.push({
        file: relativePath,
        error: result.errorMessage || 'Unknown error'
      });
    }
  }

  // Report results
  if (errors.length === 0) {
    console.log('✓ All schemas valid - no mismatches detected');
    return 0;
  } else {
    console.log(`\n✗ Validation failed for ${errors.length} schema(s):\n`);

    for (const { file, error } of errors) {
      console.log(`  File: ${file}`);
      console.log(`  Error: ${error}\n`);
    }

    console.log(`✗ ${errors.length} validation error(s) found`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
