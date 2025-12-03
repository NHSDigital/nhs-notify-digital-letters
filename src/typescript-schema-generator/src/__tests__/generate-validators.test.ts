/* eslint-disable security/detect-non-literal-fs-filename */
import standaloneCode from 'ajv/dist/standalone';
import { eventSchemasDir } from 'file-utils';
import { generateValidators } from 'generate-validators';
import mockFs from 'mock-fs';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

jest.mock('ajv/dist/2020');
jest.mock('ajv/dist/standalone');

describe('generate-validators', () => {
  const outputDir = path.resolve(__dirname, '..', '..', 'validators');

  beforeEach(() => {
    mockFs({
      [eventSchemasDir]: {
        'one.flattened.schema.json': '{"title": "One"}',
        'two.flattened.schema.json': '{"title": "Two"}',
        'three.flattened.schema.json': '{"title": "Three"}',
      },
    });

    jest.mocked(standaloneCode).mockReturnValue('Some validator code');

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'group').mockImplementation(() => {});
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('should generate a validator function file for each schema', () => {
    generateValidators();

    const validatorFunctionFiles = readdirSync(outputDir);

    expect(validatorFunctionFiles.length).toBe(4); // 3 schemas + 1 index file
    expect(validatorFunctionFiles).toEqual(
      expect.arrayContaining(['One.js', 'Two.js', 'Three.js']),
    );
  });

  it('should create an index file declaring modules for all generated files', () => {
    generateValidators();

    const indexFileContents = readFileSync(
      path.join(outputDir, 'index.d.ts'),
      'utf8',
    );
    expect(indexFileContents).toContain(
      "declare module 'typescript-schema-generator/One.js';",
    );
    expect(indexFileContents).toContain(
      "declare module 'typescript-schema-generator/Two.js';",
    );
    expect(indexFileContents).toContain(
      "declare module 'typescript-schema-generator/Three.js';",
    );
  });
});
