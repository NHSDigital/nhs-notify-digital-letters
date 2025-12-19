import mockFs from 'mock-fs';
import path from 'node:path';
import { eventSchemasDir, listEventSchemas, loadSchema } from 'utils';

describe('schema-utils', () => {
  beforeEach(() => {
    mockFs({
      [eventSchemasDir]: {
        'one.flattened.schema.json': '{"title": "One"}',
        'two.schema.json': '{"title": "Two"}',
        'three.flattened.schema.json': '{"title": "Three"}',
        'four.flattened.schema.txt': '{"title": "Four"}',
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('listEventSchemas', () => {
    it('should list all flattened schemas', () => {
      const schemas = listEventSchemas();

      expect(schemas.length).toBe(2);
      expect(schemas).toEqual(
        expect.arrayContaining([
          'one.flattened.schema.json',
          'three.flattened.schema.json',
        ]),
      );
    });
  });

  describe('loadSchema', () => {
    it('should load and parse a JSON schema', () => {
      const schemaPath = path.resolve(
        eventSchemasDir,
        'one.flattened.schema.json',
      );

      const schema = loadSchema(schemaPath);

      expect(schema).toEqual({ title: 'One' });
    });
  });
});
