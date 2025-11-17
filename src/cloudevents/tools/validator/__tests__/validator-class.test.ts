/**
 * Unit tests for Validator class
 * Tests the Validator class programmatically without spawning processes
 */

import { beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { Validator } from '../validator';

const TEST_DIR = path.join(__dirname, 'temp-validator-class-test');

describe('Validator class', () => {
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

  describe('constructor', () => {
    it('should create Validator instance with schema directory', () => {
      const validator = new Validator({ schemaDir: TEST_DIR });
      expect(validator).toBeInstanceOf(Validator);
      expect(validator.getSchemaDir()).toBe(TEST_DIR);
    });

    it('should load schemas from directory', () => {
      // Create a test schema
      const schemaPath = path.join(TEST_DIR, 'test.schema.json');
      fs.writeFileSync(schemaPath, JSON.stringify({
        $id: 'http://example.com/test.json',
        type: 'object',
        properties: { name: { type: 'string' } }
      }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      expect(validator.getLoadedSchemasCount()).toBeGreaterThan(0);
    });

    it('should accept custom maxRequestsPerUri', () => {
      const validator = new Validator({
        schemaDir: TEST_DIR,
        maxRequestsPerUri: 10
      });
      expect(validator).toBeInstanceOf(Validator);
    });
  });

  describe('validate method', () => {
    it('should validate valid data against schema', async () => {
      // Create schema
      const schemaPath = path.join(TEST_DIR, 'schema.json');
      fs.writeFileSync(schemaPath, JSON.stringify({
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' }
        }
      }));

      // Create valid data
      const dataPath = path.join(TEST_DIR, 'data.json');
      fs.writeFileSync(dataPath, JSON.stringify({ name: 'Test' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaPath, dataPath);

      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ name: 'Test' });
    });

    it('should reject invalid data against schema', async () => {
      // Create schema
      const schemaPath = path.join(TEST_DIR, 'schema.json');
      fs.writeFileSync(schemaPath, JSON.stringify({
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' }
        }
      }));

      // Create invalid data (missing required field)
      const dataPath = path.join(TEST_DIR, 'data.json');
      fs.writeFileSync(dataPath, JSON.stringify({ age: 25 }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaPath, dataPath);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.formattedErrors).toBeDefined();
    });

    it('should return formatted error messages', async () => {
      // Create schema
      const schemaPath = path.join(TEST_DIR, 'schema.json');
      fs.writeFileSync(schemaPath, JSON.stringify({
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      }));

      // Create invalid data
      const dataPath = path.join(TEST_DIR, 'data.json');
      fs.writeFileSync(dataPath, JSON.stringify({ email: 'not-an-email' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaPath, dataPath);

      expect(result.valid).toBe(false);
      expect(result.formattedErrors).toContain('email');
    });

    it('should handle validation errors gracefully', async () => {
      const validator = new Validator({ schemaDir: TEST_DIR });

      // Try to validate with non-existent file
      const result = await validator.validate(
        path.join(TEST_DIR, 'nonexistent.json'),
        path.join(TEST_DIR, 'also-nonexistent.json')
      );

      expect(result.valid).toBe(false);
      expect(result.formattedErrors).toBeDefined();
    });

    it('should validate nested objects', async () => {
      // Create schema with nested structure
      const schemaPath = path.join(TEST_DIR, 'schema.json');
      fs.writeFileSync(schemaPath, JSON.stringify({
        type: 'object',
        required: ['person'],
        properties: {
          person: {
            type: 'object',
            required: ['name', 'address'],
            properties: {
              name: { type: 'string' },
              address: {
                type: 'object',
                required: ['city'],
                properties: {
                  city: { type: 'string' }
                }
              }
            }
          }
        }
      }));

      // Create valid nested data
      const dataPath = path.join(TEST_DIR, 'data.json');
      fs.writeFileSync(dataPath, JSON.stringify({
        person: {
          name: 'John',
          address: {
            city: 'London'
          }
        }
      }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaPath, dataPath);

      expect(result.valid).toBe(true);
    });
  });

  describe('getSchemaDir method', () => {
    it('should return the configured schema directory', () => {
      const testDir = path.join(TEST_DIR, 'schemas');
      fs.mkdirSync(testDir, { recursive: true });

      const validator = new Validator({ schemaDir: testDir });
      expect(validator.getSchemaDir()).toBe(testDir);
    });
  });

  describe('getLoadedSchemasCount method', () => {
    it('should return number of loaded schemas', () => {
      const validator = new Validator({ schemaDir: TEST_DIR });
      const count = validator.getLoadedSchemasCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should increase when schemas are added to directory', () => {
      // Create first schema
      const schema1 = path.join(TEST_DIR, 'schema1.json');
      fs.writeFileSync(schema1, JSON.stringify({
        $id: 'http://example.com/schema1.json',
        type: 'object'
      }));

      const validator1 = new Validator({ schemaDir: TEST_DIR });
      const count1 = validator1.getLoadedSchemasCount();

      // Create second schema
      const schema2 = path.join(TEST_DIR, 'schema2.json');
      fs.writeFileSync(schema2, JSON.stringify({
        $id: 'http://example.com/schema2.json',
        type: 'string'
      }));

      const validator2 = new Validator({ schemaDir: TEST_DIR });
      const count2 = validator2.getLoadedSchemasCount();

      expect(count2).toBeGreaterThan(count1);
    });
  });
});
