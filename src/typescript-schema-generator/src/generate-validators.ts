import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import standaloneCode from 'ajv/dist/standalone';
import addFormats from 'ajv-formats';

const schemaFoo = {
  $id: '#/definitions/Foo',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    foo: { $ref: '#/definitions/Bar' },
  },
};
const schemaBar = {
  $id: '#/definitions/Bar',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    bar: { type: 'string' },
  },
  required: ['bar'],
};

// For ESM, the export name needs to be a valid export name, it can not be `export const #/definitions/Foo = ...;` so we
// need to provide a mapping between a valid name and the $id field. Below will generate
// `export const Foo = ...;export const Bar = ...;`
// This mapping would not have been needed if the `$ids` was just `Bar` and `Foo` instead of `#/definitions/Foo`
// and `#/definitions/Bar` respectively
const ajv = new Ajv({
  schemas: [schemaFoo, schemaBar],
  // code: { source: true, esm: true, lines: true },
  code: { source: true, lines: true },
});
addFormats(ajv);

const moduleCode = standaloneCode(ajv, {
  Foo: '#/definitions/Foo',
  Bar: '#/definitions/Bar',
});

const outDir = path.resolve(__dirname, '..', 'validators');
mkdirSync(outDir, { recursive: true });

// Now you can write the module code to file
// writeFileSync(path.join(outDir, 'validate-esm.mjs'), moduleCode);
writeFileSync(path.join(outDir, 'validate.js'), moduleCode);
