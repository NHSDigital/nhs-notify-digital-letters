/**
 * Unit tests for validator-lib.ts
 * Tests individual validator functions with code coverage
 */

import { beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  findAllSchemaFiles,
  loadSchemaFile,
  validateNhsNumber,
  diagnoseNhsNumber,
  determineSchemaDir,
  parseCliArgs,
  isSchemaFile,
  registerSchemaVariants,
  buildSchemaRegistry,
  shouldBlockMetaschema,
  handleHttpSchemaLoad,
  handleBaseRelativeSchemaLoad,
  determineSchemaId,
  addCustomFormats,
  addSchemasToAjv,
  buildRemoteSchemaUrl,
  findMainSchema,
  formatValidationError,
  formatAllValidationErrors,
} from '../validator-lib';

const TEST_DIR = path.join(__dirname, 'temp-validator-lib-test');

describe('validator-lib', () => {
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('findAllSchemaFiles', () => {
    it('should find JSON schema files', () => {
      const schemaFile = path.join(TEST_DIR, 'test.schema.json');
      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'object' }));

      const files = findAllSchemaFiles(TEST_DIR);
      expect(files).toContain(schemaFile);
      expect(files.length).toBe(1);
    });

    it('should find YAML schema files', () => {
      const yamlFile = path.join(TEST_DIR, 'test.yaml');
      fs.writeFileSync(yamlFile, 'type: object');

      const files = findAllSchemaFiles(TEST_DIR);
      expect(files).toContain(yamlFile);
    });

    it('should find schema files recursively', () => {
      const subdir = path.join(TEST_DIR, 'subdir');
      fs.mkdirSync(subdir, { recursive: true });

      const file1 = path.join(TEST_DIR, 'root.json');
      const file2 = path.join(subdir, 'nested.json');

      fs.writeFileSync(file1, '{}');
      fs.writeFileSync(file2, '{}');

      const files = findAllSchemaFiles(TEST_DIR);
      expect(files).toContain(file1);
      expect(files).toContain(file2);
      expect(files.length).toBe(2);
    });

    it('should return empty array for non-existent directory', () => {
      const files = findAllSchemaFiles(path.join(TEST_DIR, 'nonexistent'));
      expect(files).toEqual([]);
    });

    it('should find .yml files', () => {
      const ymlFile = path.join(TEST_DIR, 'test.yml');
      fs.writeFileSync(ymlFile, 'type: string');

      const files = findAllSchemaFiles(TEST_DIR);
      expect(files).toContain(ymlFile);
    });

    it('should find .schema.json files', () => {
      const schemaFile = path.join(TEST_DIR, 'custom.schema.json');
      fs.writeFileSync(schemaFile, '{"type": "string"}');

      const files = findAllSchemaFiles(TEST_DIR);
      expect(files).toContain(schemaFile);
    });

    it('should ignore non-schema files', () => {
      fs.writeFileSync(path.join(TEST_DIR, 'test.txt'), 'text');
      fs.writeFileSync(path.join(TEST_DIR, 'test.md'), '# Markdown');
      fs.writeFileSync(path.join(TEST_DIR, 'schema.json'), '{}');

      const files = findAllSchemaFiles(TEST_DIR);
      expect(files.length).toBe(1);
      expect(files[0]).toContain('schema.json');
    });
  });

  describe('loadSchemaFile', () => {
    it('should load JSON schema file', () => {
      const schemaFile = path.join(TEST_DIR, 'test.json');
      const schema = { type: 'object', properties: { name: { type: 'string' } } };
      fs.writeFileSync(schemaFile, JSON.stringify(schema));

      const loaded = loadSchemaFile(schemaFile);
      expect(loaded).toEqual(schema);
    });

    it('should load YAML schema file', () => {
      const yamlFile = path.join(TEST_DIR, 'test.yaml');
      const yamlContent = `
type: object
properties:
  name:
    type: string
`;
      fs.writeFileSync(yamlFile, yamlContent);

      const loaded = loadSchemaFile(yamlFile);
      expect(loaded).toEqual({
        type: 'object',
        properties: { name: { type: 'string' } }
      });
    });

    it('should load .yml file', () => {
      const ymlFile = path.join(TEST_DIR, 'test.yml');
      fs.writeFileSync(ymlFile, 'type: string');

      const loaded = loadSchemaFile(ymlFile);
      expect(loaded).toEqual({ type: 'string' });
    });

    it('should return null for invalid JSON', () => {
      const invalidFile = path.join(TEST_DIR, 'invalid.json');
      fs.writeFileSync(invalidFile, '{ invalid json }');

      const loaded = loadSchemaFile(invalidFile);
      expect(loaded).toBeNull();
    });

    it('should return null for non-existent file', () => {
      const loaded = loadSchemaFile(path.join(TEST_DIR, 'nonexistent.json'));
      expect(loaded).toBeNull();
    });

    it('should return null for invalid YAML', () => {
      const invalidFile = path.join(TEST_DIR, 'invalid.yaml');
      fs.writeFileSync(invalidFile, 'invalid: yaml: structure:');

      const loaded = loadSchemaFile(invalidFile);
      expect(loaded).toBeNull();
    });
  });

  describe('validateNhsNumber', () => {
    it('should validate correct NHS number', () => {
      expect(validateNhsNumber('9434765870')).toBe(true);
    });

    it('should validate NHS number with spaces', () => {
      expect(validateNhsNumber('943 476 5870')).toBe(true);
    });

    it('should reject invalid checksum', () => {
      expect(validateNhsNumber('9434765871')).toBe(false);
    });

    it('should reject non-string input', () => {
      expect(validateNhsNumber(123 as any)).toBe(false);
      expect(validateNhsNumber(null as any)).toBe(false);
      expect(validateNhsNumber(undefined as any)).toBe(false);
    });

    it('should reject too short NHS number', () => {
      expect(validateNhsNumber('123')).toBe(false);
    });

    it('should reject too long NHS number', () => {
      expect(validateNhsNumber('12345678901')).toBe(false);
    });

    it('should reject non-numeric characters', () => {
      expect(validateNhsNumber('ABC1234567')).toBe(false);
    });

    it('should reject NHS number with check digit 10', () => {
      // An NHS number that would compute to check digit 10 is invalid
      // '000000006' computes to check digit 10, so with any final digit it's invalid
      expect(validateNhsNumber('0000000060')).toBe(false);
    });

    it('should validate another valid NHS number', () => {
      expect(validateNhsNumber('5990128088')).toBe(true);
    });

    it('should handle multiple spaces', () => {
      expect(validateNhsNumber('943  476  5870')).toBe(true);
    });
  });

  describe('diagnoseNhsNumber', () => {
    it('should diagnose valid NHS number', () => {
      const result = diagnoseNhsNumber('9434765870') as any;
      expect(result.valid).toBe(true);
      expect(result.reason).toBe('OK');
      expect(result.expectedCheck).toBe(0);
      expect(result.providedCheck).toBe(0);
    });

    it('should diagnose non-string input', () => {
      const result = diagnoseNhsNumber(123 as any) as any;
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Value is not a string');
    });

    it('should diagnose wrong length', () => {
      const result = diagnoseNhsNumber('123') as any;
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('exactly 10 digits');
    });

    it('should diagnose checksum mismatch', () => {
      const result = diagnoseNhsNumber('9434765871') as any;
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Checksum mismatch');
      expect(result.expectedCheck).toBe(0);
      expect(result.providedCheck).toBe(1);
    });

    it('should diagnose check digit 10', () => {
      const result = diagnoseNhsNumber('0000000060') as any;
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('check digit is 10');
      expect(result.expectedCheck).toBe(10);
    });

    it('should handle spaces in NHS number', () => {
      const result = diagnoseNhsNumber('943 476 5870') as any;
      expect(result.valid).toBe(true);
      expect(result.original).toBe('943 476 5870');
    });

    it('should preserve original value in diagnosis', () => {
      const original = '9434765871';
      const result = diagnoseNhsNumber(original) as any;
      expect(result.original).toBe(original);
    });

    it('should diagnose non-numeric characters', () => {
      const result = diagnoseNhsNumber('ABC123456D') as any;
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('exactly 10 digits');
    });
  });

  describe('determineSchemaDir', () => {
    it('should find src directory', () => {
      const testPath = '/path/to/src/schemas/test.schema.json';
      const result = determineSchemaDir(testPath);
      expect(result).toBe('/path/to/src');
    });

    it('should find output directory', () => {
      const testPath = '/path/to/output/schemas/test.schema.json';
      const result = determineSchemaDir(testPath);
      expect(result).toBe('/path/to/output');
    });

    it('should fall back to parent directory if src/output not found', () => {
      const testPath = '/some/other/path/test.schema.json';
      const result = determineSchemaDir(testPath);
      expect(result).toBe('/some/other/path');
    });

    it('should handle root directory', () => {
      const testPath = '/test.json';
      const result = determineSchemaDir(testPath);
      expect(result).toBe('/');
    });
  });

  describe('parseCliArgs', () => {
    it('should parse schema and data paths', () => {
      const args = ['schema.json', 'data.json'];
      const result = parseCliArgs(args);
      expect(result.schemaPath).toBe('schema.json');
      expect(result.dataPath).toBe('data.json');
      expect(result.baseDir).toBeNull();
    });

    it('should parse --base option', () => {
      const args = ['--base', '/path/to/base', 'schema.json', 'data.json'];
      const result = parseCliArgs(args);
      expect(result.schemaPath).toBe('schema.json');
      expect(result.dataPath).toBe('data.json');
      expect(result.baseDir).toBe('/path/to/base');
    });

    it('should handle --base before schema', () => {
      const args = ['--base', '/base', 'test.json', 'data.json'];
      const result = parseCliArgs(args);
      expect(result.baseDir).toBe('/base');
      expect(result.schemaPath).toBe('test.json');
    });

    it('should handle empty args', () => {
      const args: string[] = [];
      const result = parseCliArgs(args);
      expect(result.schemaPath).toBeNull();
      expect(result.dataPath).toBeNull();
      expect(result.baseDir).toBeNull();
    });

    it('should handle only schema path', () => {
      const args = ['schema.json'];
      const result = parseCliArgs(args);
      expect(result.schemaPath).toBe('schema.json');
      expect(result.dataPath).toBeNull();
    });
  });

  describe('isSchemaFile', () => {
    it('should identify .json files', () => {
      expect(isSchemaFile('test.json')).toBe(true);
    });

    it('should identify .schema.json files', () => {
      expect(isSchemaFile('test.schema.json')).toBe(true);
    });

    it('should identify .yaml files', () => {
      expect(isSchemaFile('test.yaml')).toBe(true);
    });

    it('should identify .yml files', () => {
      expect(isSchemaFile('test.yml')).toBe(true);
    });

    it('should reject non-schema files', () => {
      expect(isSchemaFile('test.txt')).toBe(false);
      expect(isSchemaFile('test.md')).toBe(false);
      expect(isSchemaFile('test.js')).toBe(false);
    });

    it('should work with full paths', () => {
      expect(isSchemaFile('/path/to/schema.json')).toBe(true);
      expect(isSchemaFile('/path/to/file.txt')).toBe(false);
    });
  });

  describe('registerSchemaVariants', () => {
    it('should register schema with multiple path variants', () => {
      const schemas: Record<string, any> = {};
      const schemasById: Record<string, any> = {};
      const absolutePath = '/path/to/schema.json';
      const relPath = './schema.json';
      const content = { $id: 'http://example.com/schema', type: 'object' };

      registerSchemaVariants(absolutePath, relPath, content, schemas, schemasById);

      expect(schemas[absolutePath]).toBe(content);
      expect(schemas[relPath]).toBe(content);
      expect(schemas['schema.json']).toBe(content);
      expect(schemas['./schema.json']).toBe(content);
      expect(schemas['/schema.json']).toBe(content);
      expect(schemasById['http://example.com/schema']).toBe(content);
    });

    it('should not add to schemasById if no $id', () => {
      const schemas: Record<string, any> = {};
      const schemasById: Record<string, any> = {};
      const content = { type: 'object' };

      registerSchemaVariants('/path/test.json', './test.json', content, schemas, schemasById);

      expect(Object.keys(schemasById).length).toBe(0);
    });
  });

  describe('buildSchemaRegistry', () => {
    it('should build registry from schema files', () => {
      const schema1 = path.join(TEST_DIR, 'schema1.json');
      const schema2 = path.join(TEST_DIR, 'schema2.json');
      fs.writeFileSync(schema1, JSON.stringify({ type: 'object', $id: 'schema1' }));
      fs.writeFileSync(schema2, JSON.stringify({ type: 'string', $id: 'schema2' }));

      const { schemas, schemasById } = buildSchemaRegistry([schema1, schema2], TEST_DIR);

      expect(schemas[path.resolve(schema1)]).toBeDefined();
      expect(schemas[path.resolve(schema2)]).toBeDefined();
      expect(schemasById['schema1']).toBeDefined();
      expect(schemasById['schema2']).toBeDefined();
    });

    it('should skip invalid schema files', () => {
      const validSchema = path.join(TEST_DIR, 'valid.json');
      const invalidSchema = path.join(TEST_DIR, 'invalid.json');
      fs.writeFileSync(validSchema, JSON.stringify({ type: 'object' }));
      fs.writeFileSync(invalidSchema, 'invalid json{');

      const { schemas } = buildSchemaRegistry([validSchema, invalidSchema], TEST_DIR);

      expect(schemas[path.resolve(validSchema)]).toBeDefined();
      expect(schemas[path.resolve(invalidSchema)]).toBeUndefined();
    });

    it('should skip array schemas', () => {
      const arraySchema = path.join(TEST_DIR, 'array.json');
      fs.writeFileSync(arraySchema, JSON.stringify([1, 2, 3]));

      const { schemas } = buildSchemaRegistry([arraySchema], TEST_DIR);

      expect(schemas[path.resolve(arraySchema)]).toBeUndefined();
    });
  });

  describe('shouldBlockMetaschema', () => {
    it('should block draft-07 metaschema HTTP', () => {
      expect(shouldBlockMetaschema('http://json-schema.org/draft-07/schema')).toBe(true);
      expect(shouldBlockMetaschema('http://json-schema.org/draft-07/schema#')).toBe(true);
    });

    it('should block draft-07 metaschema HTTPS', () => {
      expect(shouldBlockMetaschema('https://json-schema.org/draft-07/schema')).toBe(true);
      expect(shouldBlockMetaschema('https://json-schema.org/draft-07/schema#')).toBe(true);
    });

    it('should not block other URIs', () => {
      expect(shouldBlockMetaschema('http://example.com/schema')).toBe(false);
      expect(shouldBlockMetaschema('https://example.com/schema')).toBe(false);
    });
  });

  describe('handleHttpSchemaLoad', () => {
    it('should load schema from cache', async () => {
      const mockGetCache = async (uri: string) => JSON.stringify({ type: 'object' });

      const result = await handleHttpSchemaLoad('http://example.com/schema', mockGetCache);

      expect(result).toEqual({ type: 'object' });
    });

    it('should throw error if cache returns null', async () => {
      const mockGetCache = async (uri: string) => null;

      await expect(handleHttpSchemaLoad('http://example.com/schema', mockGetCache))
        .rejects.toThrow('Failed to fetch schema');
    });

    it('should throw error if cached schema is invalid JSON', async () => {
      const mockGetCache = async (uri: string) => 'invalid json{';

      await expect(handleHttpSchemaLoad('http://example.com/schema', mockGetCache))
        .rejects.toThrow('Failed to parse schema');
    });
  });

  describe('handleBaseRelativeSchemaLoad', () => {
    it('should return already loaded schema', () => {
      const schemas = { '/common/schema.json': { type: 'object', $id: 'test' } };

      const result = handleBaseRelativeSchemaLoad('/common/schema.json', schemas, TEST_DIR);

      expect(result).toEqual({ type: 'object' });
      expect(result.$id).toBeUndefined(); // $id should be removed
    });

    it('should load schema from filesystem', () => {
      const schemaFile = path.join(TEST_DIR, 'test.json');
      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'string', $id: 'fs-test' }));

      const result = handleBaseRelativeSchemaLoad('/test.json', {}, TEST_DIR);

      expect(result).toEqual({ type: 'string' });
      expect(result.$id).toBeUndefined();
    });

    it('should return null if schema not found', () => {
      const result = handleBaseRelativeSchemaLoad('/nonexistent.json', {}, TEST_DIR);

      expect(result).toBeNull();
    });

    it('should strip directory basename from URI', () => {
      const subDir = path.join(TEST_DIR, 'schemas');
      fs.mkdirSync(subDir, { recursive: true });
      const schemaFile = path.join(subDir, 'test.json');
      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'number' }));

      const result = handleBaseRelativeSchemaLoad('/schemas/test.json', {}, TEST_DIR);

      expect(result).toEqual({ type: 'number' });
    });
  });

  describe('determineSchemaId', () => {
    it('should use HTTP URL from $id', () => {
      const schema = { $id: 'http://example.com/schema', type: 'object' };

      const id = determineSchemaId(schema, '/path/to/schema.json');

      expect(id).toBe('http://example.com/schema');
    });

    it('should use HTTPS URL from $id', () => {
      const schema = { $id: 'https://example.com/schema', type: 'object' };

      const id = determineSchemaId(schema, '/path/to/schema.json');

      expect(id).toBe('https://example.com/schema');
    });

    it('should use schema-relative path from $id', () => {
      const schema = { $id: '/common/schema.json', type: 'object' };

      const id = determineSchemaId(schema, '/absolute/path/schema.json');

      expect(id).toBe('/common/schema.json');
    });

    it('should use absolute path if $id looks like filesystem path', () => {
      const schema = { $id: '/home/user/schema.json', type: 'object' };

      const id = determineSchemaId(schema, '/other/path/schema.json');

      expect(id).toBe('/other/path/schema.json');
    });

    it('should use absolute path if no $id', () => {
      const schema = { type: 'object' };

      const id = determineSchemaId(schema, '/path/to/schema.json');

      expect(id).toBe('/path/to/schema.json');
    });
  });

  describe('addCustomFormats', () => {
    it('should add NHS number format to AJV', () => {
      const mockAjv = {
        addFormat: jest.fn()
      };
      const mockValidator = jest.fn();

      addCustomFormats(mockAjv, mockValidator);

      expect(mockAjv.addFormat).toHaveBeenCalledWith('nhs-number', {
        type: 'string',
        validate: mockValidator
      });
    });
  });

  describe('addSchemasToAjv', () => {
    it('should add schemas with absolute paths to AJV', () => {
      const mockAjv = {
        addSchema: jest.fn()
      };
      const schemas = {
        '/absolute/path/schema1.json': { type: 'object', $id: 'schema1' },
        '/absolute/path/schema2.json': { type: 'string' },
        'relative/path.json': { type: 'number' }
      };

      const added = addSchemasToAjv(mockAjv, schemas);

      expect(mockAjv.addSchema).toHaveBeenCalledTimes(2);
      expect(added.size).toBe(2); // 2 absolute paths (schema1 also adds its $id but size tracks unique additions)
    });
  });

  describe('buildRemoteSchemaUrl', () => {
    it('should build URL for common schemas', () => {
      const url = buildRemoteSchemaUrl('/path/common/2025-11-draft/schema.schema.json');

      expect(url).toBe('https://notify.nhs.uk/cloudevents/schemas/common/2025-11-draft/schema.schema.json');
    });

    it('should build URL for examples schemas', () => {
      const url = buildRemoteSchemaUrl('/path/examples/v1/test.schema.json');

      expect(url).toBe('https://notify.nhs.uk/cloudevents/schemas/examples/v1/test.schema.json');
    });

    it('should build URL for supplier-allocation schemas', () => {
      const url = buildRemoteSchemaUrl('/path/supplier-allocation/v2/schema.schema.json');

      expect(url).toBe('https://notify.nhs.uk/cloudevents/schemas/supplier-allocation/v2/schema.schema.json');
    });

    it('should return null for non-matching paths', () => {
      const url = buildRemoteSchemaUrl('/path/other/schema.json');

      expect(url).toBeNull();
    });
  });

  describe('findMainSchema', () => {
    it('should find schema from loaded files', () => {
      const schemaFile = path.join(TEST_DIR, 'main.json');
      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'object', $id: '/common/main-schema.json' }));
      const schemas: Record<string, any> = {};
      schemas[path.resolve(schemaFile)] = { type: 'object', $id: '/common/main-schema.json' };

      const result = findMainSchema(schemaFile, [schemaFile], schemas);

      expect(result.schema).toEqual({ type: 'object', $id: '/common/main-schema.json' });
      expect(result.schemaId).toBe('/common/main-schema.json'); // Schema-relative path preferred
    });

    it('should load schema from filesystem if not in loaded files', () => {
      const schemaFile = path.join(TEST_DIR, 'external.json');
      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'string' }));

      const result = findMainSchema(schemaFile, [], {});

      expect(result.schema).toEqual({ type: 'string' });
      expect(result.schemaId).toBe(path.resolve(schemaFile));
    });

    it('should return remote URL if file not found', () => {
      const schemaPath = '/path/common/2025-11-draft/test.schema.json';

      const result = findMainSchema(schemaPath, [], {});

      expect(result.schema).toBeNull();
      expect(result.schemaId).toBe('https://notify.nhs.uk/cloudevents/schemas/common/2025-11-draft/test.schema.json');
    });

    it('should throw error if schema cannot be determined', () => {
      expect(() => findMainSchema('/nonexistent/schema.json', [], {}))
        .toThrow('Schema file not found');
    });
  });

  describe('formatValidationError', () => {
    it('should format basic validation error', () => {
      const err = {
        instancePath: '/name',
        schemaPath: '#/properties/name/type',
        keyword: 'type',
        params: { type: 'string' },
        message: 'must be string'
      };
      const data = { name: 123 };

      const formatted = formatValidationError(err, data);

      expect(formatted).toContain('Error at path: /name');
      expect(formatted).toContain('Value: 123');
      expect(formatted).toContain('Keyword: type');
      expect(formatted).toContain('Message: must be string');
    });

    it('should include parent schema details if available', () => {
      const err = {
        instancePath: '/email',
        schemaPath: '#/properties/email/pattern',
        keyword: 'pattern',
        params: {},
        message: 'must match pattern',
        parentSchema: {
          pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
          description: 'Email address'
        }
      };
      const data = { email: 'invalid' };

      const formatted = formatValidationError(err, data);

      expect(formatted).toContain('Pattern: ^[a-z]+@[a-z]+\\.[a-z]+$');
      expect(formatted).toContain('Description: Email address');
    });

    it('should diagnose NHS number errors', () => {
      const err = {
        instancePath: '/nhsNumber',
        schemaPath: '#/properties/nhsNumber/format',
        keyword: 'format',
        params: { format: 'nhs-number' },
        message: 'must match format "nhs-number"'
      };
      // Use NHS number with wrong checksum
      const data = { nhsNumber: '9434765910' }; // Expected check digit is 9, not 0

      const formatted = formatValidationError(err, data, diagnoseNhsNumber);

      expect(formatted).toContain('NHS Number invalid');
      expect(formatted).toContain('Checksum mismatch');
    });
  });

  describe('formatAllValidationErrors', () => {
    it('should format multiple errors', () => {
      const errors = [
        {
          instancePath: '/name',
          schemaPath: '#/properties/name/type',
          keyword: 'type',
          params: {},
          message: 'must be string'
        },
        {
          instancePath: '/age',
          schemaPath: '#/properties/age/type',
          keyword: 'type',
          params: {},
          message: 'must be number'
        }
      ];
      const data = { name: 123, age: 'old' };

      const formatted = formatAllValidationErrors(errors, data);

      expect(formatted).toContain('Error at path: /name');
      expect(formatted).toContain('Error at path: /age');
    });

    it('should handle empty error array', () => {
      const formatted = formatAllValidationErrors([], {});

      expect(formatted).toBe('');
    });
  });
});
