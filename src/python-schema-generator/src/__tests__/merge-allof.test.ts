/* eslint-disable security/detect-non-literal-fs-filename */

import { eventSchemasDir } from 'utils';
import { mergeAllOfInSchemas } from 'merge-allof';
import mockFs from 'mock-fs';
import { readdirSync } from 'node:fs';
import path from 'node:path';

jest.mock('json-schema-to-typescript');

describe('merge-allof', () => {
  const outputDir = path.resolve(__dirname, '..', 'schemas');

  beforeEach(() => {
    mockFs({
      [eventSchemasDir]: {
        'one.flattened.schema.json': '{"title": "One"}',
        'two.flattened.schema.json': '{"title": "Two"}',
        'three.flattened.schema.json': '{"title": "Three"}',
      },
    });

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'group').mockImplementation(() => {});
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('should generate a schema with merged allOfs for each schema', () => {
    mergeAllOfInSchemas();

    const mergedSchemas = readdirSync(outputDir);

    expect(mergedSchemas.length).toBe(3);
    expect(mergedSchemas).toEqual(
      expect.arrayContaining([
        'one.flattened.schema.json',
        'two.flattened.schema.json',
        'three.flattened.schema.json',
      ]),
    );
  });
});
