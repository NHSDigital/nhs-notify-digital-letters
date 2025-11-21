/**
 * CLI tests for validate.ts
 * Tests the command-line interface by spawning processes
 * For faster validation tests, see validator-integration.test.ts
 */

import { beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const SCRIPT_PATH = path.join(__dirname, '..', 'validate.ts');
const TEST_DIR = path.join(__dirname, 'temp-validate-test');

/**
 * Helper to run validator CLI and handle exit codes
 * Uses tsx for faster execution than ts-node
 */
function runValidator(schemaPath: string, dataPath: string, baseDir?: string): { success: boolean; output: string; error: string } {
  try {
    const args = baseDir ? ['--base', baseDir, schemaPath, dataPath] : [schemaPath, dataPath];
    const result = spawnSync('npx', ['tsx', SCRIPT_PATH, ...args], {
      encoding: 'utf-8',
      timeout: 15000 // Reduced timeout since tsx is faster than ts-node
    });

    return {
      success: result.status === 0,
      output: result.stdout || '',
      error: result.stderr || ''
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: String(error)
    };
  }
}

describe('validate.ts CLI', () => {
  // Reduced timeout since tsx is much faster than ts-node
  jest.setTimeout(20000); // 20 seconds per test

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

  describe('command line arguments', () => {
    it('should exit with error when no arguments provided', () => {
      const result = spawnSync('npx', ['tsx', SCRIPT_PATH], { encoding: 'utf-8', timeout: 15000 });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Usage:');
    });

    it('should exit with error when only schema argument provided', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.json');
      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'object' }));

      const result = spawnSync('npx', ['tsx', SCRIPT_PATH, schemaFile], { encoding: 'utf-8', timeout: 15000 });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Usage:');
    });
  });

  describe('CLI output format', () => {
    it('should output "Valid!" for valid data', () => {
      const schemaFile = path.join(TEST_DIR, 'simple.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { name: { type: 'string' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ name: 'test' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Valid!');
    });

    it('should output error message for invalid data', () => {
      const schemaFile = path.join(TEST_DIR, 'required.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
      }));
      fs.writeFileSync(dataFile, JSON.stringify({}));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid:');
    });
  });

  describe('--base option', () => {
    it('should accept --base option for schema directory', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { value: { type: 'string' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ value: 'test' }));

      const result = runValidator(schemaFile, dataFile, TEST_DIR);
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent schema file', () => {
      const schemaFile = path.join(TEST_DIR, 'nonexistent.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(dataFile, JSON.stringify({ value: 'test' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(false);
    });

    it('should handle non-existent data file', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.json');
      const dataFile = path.join(TEST_DIR, 'nonexistent.json');

      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'object' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(false);
    });

    it('should handle invalid JSON in data file', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'object' }));
      fs.writeFileSync(dataFile, '{ invalid json }');

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(false);
    });
  });

  describe('basic validation', () => {
    it('should validate simple object schema', () => {
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

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Valid!');
    });

    it('should reject data missing required field', () => {
      const schemaFile = path.join(TEST_DIR, 'required.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      };

      const data = {}; // missing required 'name'

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should reject data with wrong type', () => {
      const schemaFile = path.join(TEST_DIR, 'type.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      };

      const data = { message: 123 }; // number instead of string

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should validate string type', () => {
      const schemaFile = path.join(TEST_DIR, 'string.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { text: { type: 'string' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ text: 'hello' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
    });

    it('should validate number type', () => {
      const schemaFile = path.join(TEST_DIR, 'number.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { count: { type: 'number' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ count: 42 }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
    });

    it('should validate array type', () => {
      const schemaFile = path.join(TEST_DIR, 'array.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ tags: ['tag1', 'tag2'] }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
    });

    it('should validate boolean type', () => {
      const schemaFile = path.join(TEST_DIR, 'boolean.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: { active: { type: 'boolean' } }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ active: true }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
    });
  });

  describe('format validation', () => {
    it('should validate date-time format', () => {
      const schemaFile = path.join(TEST_DIR, 'datetime.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' }
        }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ timestamp: '2025-11-05T12:00:00Z' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
    });

    it('should validate uuid format', () => {
      const schemaFile = path.join(TEST_DIR, 'uuid.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({
        id: '123e4567-e89b-12d3-a456-426614174000'
      }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
    });

    it('should validate email format', () => {
      const schemaFile = path.join(TEST_DIR, 'email.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' }
        }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ email: 'test@example.com' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
    });
  });

  describe('enum validation', () => {
    it('should validate value in enum', () => {
      const schemaFile = path.join(TEST_DIR, 'enum.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending']
          }
        }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ status: 'active' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
    });

    it('should reject value not in enum', () => {
      const schemaFile = path.join(TEST_DIR, 'enum.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending']
          }
        }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ status: 'invalid' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(false);
    });
  });

  describe('pattern validation', () => {
    it('should validate string matching pattern', () => {
      const schemaFile = path.join(TEST_DIR, 'pattern.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: {
          code: {
            type: 'string',
            pattern: '^[A-Z]{3}[0-9]{3}$'
          }
        }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ code: 'ABC123' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
    });

    it('should reject string not matching pattern', () => {
      const schemaFile = path.join(TEST_DIR, 'pattern.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: {
          code: {
            type: 'string',
            pattern: '^[A-Z]{3}[0-9]{3}$'
          }
        }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ code: 'ABC12' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(false);
    });
  });

  describe('YAML schema support', () => {
    it('should validate data with YAML schema', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.yaml');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const yamlSchema = `
type: object
properties:
  name:
    type: string
  age:
    type: number
required:
  - name
`;

      fs.writeFileSync(schemaFile, yamlSchema);
      fs.writeFileSync(dataFile, JSON.stringify({ name: 'Jane', age: 25 }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent schema file', () => {
      const schemaFile = path.join(TEST_DIR, 'nonexistent.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(dataFile, JSON.stringify({ test: 'data' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(false);
    });

    it('should handle non-existent data file', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.json');
      const dataFile = path.join(TEST_DIR, 'nonexistent.json');

      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'object' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(false);
    });

    it('should handle invalid JSON in data file', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'object' }));
      fs.writeFileSync(dataFile, '{ invalid json }');

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(false);
    });
  });

  describe('nested object validation', () => {
    it('should validate nested object structure', () => {
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
                  street: { type: 'string' },
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
          address: {
            street: '123 Main St',
            city: 'London'
          }
        }
      }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
    });
  });

  describe('const validation', () => {
    it('should validate const value', () => {
      const schemaFile = path.join(TEST_DIR, 'const.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: {
          version: {
            const: '1.0.0'
          }
        }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ version: '1.0.0' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(true);
    });

    it('should reject value not matching const', () => {
      const schemaFile = path.join(TEST_DIR, 'const.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({
        type: 'object',
        properties: {
          version: {
            const: '1.0.0'
          }
        }
      }));
      fs.writeFileSync(dataFile, JSON.stringify({ version: '2.0.0' }));

      const result = runValidator(schemaFile, dataFile);
      expect(result.success).toBe(false);
    });
  });
});
