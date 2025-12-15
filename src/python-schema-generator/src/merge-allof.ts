/* eslint-disable no-console */
import {
  createOutputDir,
  eventSchemasDir,
  listEventSchemas,
  loadSchema,
  writeFile,
} from 'file-utils';
import mergeAllOf from 'json-schema-merge-allof';
import path from 'node:path';

export function mergeAllOfInSchemas(): void {
  const eventSchemaFilenames = listEventSchemas();

  const outputDir = createOutputDir('schemas');

  console.log(`Output directory created at ${outputDir}`);

  console.group('Merging allOf entries in schemas:');
  for (const eventSchemaFilename of eventSchemaFilenames) {
    const eventSchemaPath = path.join(eventSchemasDir, eventSchemaFilename);
    const eventSchema = loadSchema(eventSchemaPath);

    const merged = mergeAllOf(eventSchema, {
      resolvers: {
        defaultResolver: mergeAllOf.options.resolvers.title,
      },
    });

    writeFile(outputDir, eventSchemaFilename, JSON.stringify(merged, null, 2));
    console.log(eventSchemaFilename);
  }
  console.groupEnd();
}
