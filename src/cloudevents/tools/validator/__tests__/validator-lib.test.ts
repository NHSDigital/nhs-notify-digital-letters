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
  isSchemaFile
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
});
