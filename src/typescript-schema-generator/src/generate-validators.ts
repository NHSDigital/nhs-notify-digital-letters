// We don't accept user input, so path traversal attacks should not be a risk.
/* eslint-disable security/detect-non-literal-fs-filename */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Note: We are using the Ajv 2020 version to support JSON Schema draft 2020-12.
import Ajv from 'ajv/dist/2020';

import standaloneCode from 'ajv/dist/standalone';
// import addFormats from 'ajv-formats';

const inDir = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'schemas',
  'digital-letters',
  '2025-10-draft',
  'events',
);
const flattenedSchemaFiles = readdirSync(inDir).filter((f) =>
  f.endsWith('.flattened.schema.json'),
);

const ajv = new Ajv({
  code: { source: true, lines: true },

  // Required because our schemas use the unknown keyword "name".
  strictSchema: false,
});

// !!! This doesn't work with the standalone code !!!
// If we don't enable it we don't enforce the string formats defined in the schema.
// addFormats(ajv);

const outputDir = path.resolve(__dirname, '..', 'validators');
mkdirSync(outputDir, { recursive: true });

// Generate a standalone validator for each schema.
const moduleDeclarations: string[] = [];
for (const schemaFile of flattenedSchemaFiles) {
  const schemaFilePath = path.join(inDir, schemaFile);
  const schema = JSON.parse(readFileSync(schemaFilePath, 'utf8'));
  const validatorFilename = `${schema.title}.js`;

  const validatorFn = ajv.compile(schema);
  const standaloneValidatorCode = standaloneCode(ajv, validatorFn);

  writeFileSync(
    path.join(outputDir, validatorFilename),
    standaloneValidatorCode,
  );

  // Also create a module declaration for this validator.
  moduleDeclarations.push(
    `declare module 'typescript-schema-generator/${validatorFilename}';`,
  );
}

// Write an index.d.ts file containing all module declarations.
writeFileSync(
  path.join(outputDir, 'index.d.ts'),
  `${moduleDeclarations.join('\n')}\n`,
);
