/**
 * Integration tests for Validator class
 * These tests use direct imports instead of spawning processes for speed
 */

import { beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { Validator } from '../validator.ts';

const TEST_DIR = path.join(__dirname, 'temp-validator-integration-test');

describe('Validator integration tests', () => {
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

  describe('basic validation', () => {
    it('should validate simple object schema', async () => {
      const schemaFile = path.join(TEST_DIR, 'simple.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      };

      const data = {
        name: 'John Doe',
        age: 30
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject data missing required field', async () => {
      const schemaFile = path.join(TEST_DIR, 'required.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      };

      const data = {
        age: 30
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject data with wrong type', async () => {
      const schemaFile = path.join(TEST_DIR, 'type.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          age: { type: 'number' }
        }
      };

      const data = {
        age: 'thirty'
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('type validation', () => {
    it('should validate string type', async () => {
      const schemaFile = path.join(TEST_DIR, 'string.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { text: { type: 'string' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ text: 'hello' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
    });

    it('should validate number type', async () => {
      const schemaFile = path.join(TEST_DIR, 'number.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { count: { type: 'number' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ count: 42 }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
    });

    it('should validate array type', async () => {
      const schemaFile = path.join(TEST_DIR, 'array.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { items: { type: 'array', items: { type: 'string' } } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ items: ['a', 'b', 'c'] }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
    });

    it('should validate boolean type', async () => {
      const schemaFile = path.join(TEST_DIR, 'boolean.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { active: { type: 'boolean' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ active: true }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
    });
  });

  describe('format validation', () => {
    it('should validate date-time format', async () => {
      const schemaFile = path.join(TEST_DIR, 'datetime.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { timestamp: { type: 'string', format: 'date-time' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ timestamp: '2024-01-01T12:00:00Z' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
    });

    it('should validate uuid format', async () => {
      const schemaFile = path.join(TEST_DIR, 'uuid.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
    });

    it('should validate email format', async () => {
      const schemaFile = path.join(TEST_DIR, 'email.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { email: { type: 'string', format: 'email' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ email: 'test@example.com' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
    });
  });

  describe('enum validation', () => {
    it('should validate value in enum', async () => {
      const schemaFile = path.join(TEST_DIR, 'enum.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { color: { type: 'string', enum: ['red', 'green', 'blue'] } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ color: 'red' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
    });

    it('should reject value not in enum', async () => {
      const schemaFile = path.join(TEST_DIR, 'enum.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { color: { type: 'string', enum: ['red', 'green', 'blue'] } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ color: 'yellow' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(false);
    });
  });

  describe('pattern validation', () => {
    it('should validate string matching pattern', async () => {
      const schemaFile = path.join(TEST_DIR, 'pattern.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { code: { type: 'string', pattern: '^[A-Z]{3}$' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ code: 'ABC' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
    });

    it('should reject string not matching pattern', async () => {
      const schemaFile = path.join(TEST_DIR, 'pattern.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { code: { type: 'string', pattern: '^[A-Z]{3}$' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ code: 'abc' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(false);
    });
  });

  describe('YAML schema support', () => {
    it('should validate data with YAML schema', async () => {
      const schemaFile = path.join(TEST_DIR, 'schema.yaml');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const yamlSchema = `
type: object
properties:
  name:
    type: string
required:
  - name
`;

      fs.writeFileSync(schemaFile, yamlSchema);
      fs.writeFileSync(dataFile, JSON.stringify({ name: 'Test' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
    });
  });

  describe('nested object validation', () => {
    it('should validate nested object structure', async () => {
      const schemaFile = path.join(TEST_DIR, 'nested.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  city: { type: 'string' }
                }
              }
            }
          }
        }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({
        user: {
          name: 'John',
          address: { city: 'London' }
        }
      }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
    });
  });

  describe('const validation', () => {
    it('should validate const value', async () => {
      const schemaFile = path.join(TEST_DIR, 'const.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { version: { const: '1.0.0' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ version: '1.0.0' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(true);
    });

    it('should reject value not matching const', async () => {
      const schemaFile = path.join(TEST_DIR, 'const.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { version: { const: '1.0.0' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ version: '2.0.0' }));

      const validator = new Validator({ schemaDir: TEST_DIR });
      const result = await validator.validate(schemaFile, dataFile);

      expect(result.valid).toBe(false);
    });
  });
});
