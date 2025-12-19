/* eslint-disable no-console */
import { createOutputDir, writeFile, writeTypesIndex } from 'file-utils';
import { compile } from 'json-schema-to-typescript';
import path from 'node:path';
import { eventSchemasDir, listEventSchemas, loadSchema } from 'utils';

export async function generateTypes() {
  const eventSchemaFilenames = listEventSchemas();
  const outputDir = createOutputDir('types');
  console.log(`Output directory created at ${outputDir}`);

  console.group('Writing type declaration files:');
  const indexLines: string[] = [];
  for (const eventSchemaFilename of eventSchemaFilenames) {
    const eventSchemaPath = path.join(eventSchemasDir, eventSchemaFilename);
    const eventSchema = loadSchema(eventSchemaPath);
    const typeName = eventSchema.title;

    const eventTs = await compile(eventSchema, eventSchema.title, {
      additionalProperties: false,
    });

    // Write a .d.ts file named after the schema title or file.
    const typeDeclarationFilename = `${typeName}.d.ts`;
    writeFile(outputDir, typeDeclarationFilename, eventTs);
    console.log(typeDeclarationFilename);

    // Also create an export statement for this type.
    indexLines.push(`export * from './${typeName}';`);
  }
  console.groupEnd();

  writeTypesIndex(outputDir, indexLines);
  console.log('index.d.ts file written');
}
