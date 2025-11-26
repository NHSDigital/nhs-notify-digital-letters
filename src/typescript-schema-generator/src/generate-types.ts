/* eslint-disable no-console */
import { compile } from 'json-schema-to-typescript';
import path from 'node:path';
import {
  createOutputDir,
  eventSchemasDir,
  listEventSchemas,
  loadSchema,
  writeFile,
  writeTypesIndex,
} from 'file-utils';

const eventSchemaFilenames = listEventSchemas();
const outputDir = createOutputDir('types');

async function generateTypes() {
  const indexLines: string[] = [];
  for (const eventSchemaFilename of eventSchemaFilenames) {
    const eventSchemaPath = path.join(eventSchemasDir, eventSchemaFilename);
    const eventSchema = loadSchema(eventSchemaPath);
    const typeName = eventSchema.title;

    const eventTs = await compile(eventSchema, eventSchema.title, {
      additionalProperties: false,
    });

    // Write a .d.ts file named after the schema title or file.
    writeFile(outputDir, `${typeName}.d.ts`, eventTs);

    // Also create an export statement for this type.
    indexLines.push(`export * from './${typeName}';`);
  }

  writeTypesIndex(outputDir, indexLines);
}

generateTypes().catch((error) => {
  console.error('Error generating types:', error);
  throw error;
});
