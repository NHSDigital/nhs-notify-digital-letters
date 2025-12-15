// We don't accept user input, so path traversal attacks should not be a risk.
/* eslint-disable security/detect-non-literal-fs-filename */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const eventSchemasDir = path.resolve(
  __dirname,
  '..',
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
