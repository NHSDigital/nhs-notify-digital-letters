// We don't accept user input, so path traversal attacks should not be a risk.
/* eslint-disable security/detect-non-literal-fs-filename */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const eventSchemasDir = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'schemas',
  'digital-letters',
  '2025-10-draft',
  'events',
);

export const destinationPackageName = 'digital-letters-events';

/**
 * Lists all event schema filenames in the digital letters schemas directory.
 *
 * @returns An array of schema filenames.
 */
export function listEventSchemas(): string[] {
  const flattenedSchemaFiles = readdirSync(eventSchemasDir).filter((f) =>
    f.endsWith('.flattened.schema.json'),
  );

  return flattenedSchemaFiles;
}

/**
 * Loads and parses a JSON schema from the specified file path.
 *
 * @param schemaPath The path to the JSON schema file.
 * @returns The parsed JSON schema object.
 */
export function loadSchema(schemaPath: string): any {
  return JSON.parse(readFileSync(schemaPath, 'utf8'));
}

/**
 * Creates the specified output directory if it doesn't exist.
 *
 * @param dirName The name of the directory to create.
 * @returns The resolved path to the created directory.
 */
export function createOutputDir(dirName: string): string {
  const outputDir = path.resolve(
    __dirname,
    `../../${destinationPackageName}`,
    dirName,
  );
  mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

/**
 * Write a file with the specified content to the given path and filename.
 *
 * @param outputDir The directory the file will be written to.
 * @param fileName The name of the file to write.
 * @param content The content to write to the file.
 */
export function writeFile(
  outputDir: string,
  fileName: string,
  content: string,
): void {
  writeFileSync(path.join(outputDir, fileName), content);
}

/**
 * Write an index.d.ts file containing all lines provided.
 *
 * @param outputDir The output directory where the index.d.ts file will be written.
 * @param lines The lines to write to the index.d.ts file.
 */
export function writeTypesIndex(outputDir: string, lines: string[]): void {
  writeFileSync(path.join(outputDir, 'index.d.ts'), `${lines.join('\n')}\n`);
}
