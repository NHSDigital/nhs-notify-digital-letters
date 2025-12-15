/* eslint-disable no-console */
import path from 'node:path';

// Note: We are using the Ajv 2020 version to support JSON Schema draft 2020-12.
import Ajv from 'ajv/dist/2020';

import standaloneCode from 'ajv/dist/standalone';
import { createOutputDir, writeFile, writeTypesIndex } from 'file-utils';
import {
  destinationPackageName,
  eventSchemasDir,
  listEventSchemas,
  loadSchema,
} from 'utils';

export function generateValidators() {
  const ajv = new Ajv({
    code: { source: true, lines: true },

    // Required because our schemas use the unknown keyword "name".
    strictSchema: false,
  });

  const eventSchemaFilenames = listEventSchemas();
  const outputDir = createOutputDir('validators');
  console.log(`Output directory created at ${outputDir}`);

  // Generate a standalone validator for each schema.
  console.group('Writing validator function files:');
  const moduleDeclarations: string[] = [];
  for (const eventSchemaFilename of eventSchemaFilenames) {
    const eventSchemaPath = path.join(eventSchemasDir, eventSchemaFilename);
    const eventSchema = loadSchema(eventSchemaPath);
    const validatorFilename = `${eventSchema.title}.js`;

    const validatorFn = ajv.compile(eventSchema);
    const standaloneValidatorCode = standaloneCode(ajv, validatorFn);

    // Write the standalone validator to a .js file.
    writeFile(outputDir, validatorFilename, standaloneValidatorCode);
    console.log(validatorFilename);

    // Also create a module declaration for this validator.
    moduleDeclarations.push(
      `declare module '${destinationPackageName}/${validatorFilename}';`,
    );
  }
  console.groupEnd();

  writeTypesIndex(outputDir, moduleDeclarations);
  console.log('index.d.ts file written');
}
