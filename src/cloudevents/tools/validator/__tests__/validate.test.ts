/**
 * Tests for validate.js
 * Tests JSON schema validation functionality
 */

import { beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SCRIPT_PATH = path.join(__dirname, '..', 'validate.js');
const TEST_DIR = path.join(__dirname, 'temp-validate-test');

describe('validate.js', () => {
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

  describe('command line argument handling', () => {
    it('should display usage when no arguments provided', () => {
      expect(() => {
        execSync(`node ${SCRIPT_PATH}`, { stdio: 'pipe', encoding: 'utf-8' });
      }).toThrow();
    });

    it('should display usage when only schema argument provided', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.json');
      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'object' }));

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${schemaFile}`, { stdio: 'pipe', encoding: 'utf-8' });
      }).toThrow();
    });
  });

  describe('simple schema validation', () => {
    it('should validate data matching simple object schema', () => {
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

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });

    it('should reject data not matching schema', () => {
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
        age: 30
        // missing required 'name' field
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
          stdio: 'pipe',
          encoding: 'utf-8'
        });
      }).toThrow();
    });

    it('should validate data with nested objects', () => {
      const schemaFile = path.join(TEST_DIR, 'nested.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          person: {
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
      };

      const data = {
        person: {
          name: 'Jane',
          address: {
            city: 'London'
          }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });
  });

  describe('type validation', () => {
    it('should validate string type', () => {
      const schemaFile = path.join(TEST_DIR, 'string.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      };

      const data = { message: 'Hello' };

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });

    it('should reject wrong type', () => {
      const schemaFile = path.join(TEST_DIR, 'string.schema.json');
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

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('should validate array type', () => {
      const schemaFile = path.join(TEST_DIR, 'array.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      };

      const data = { tags: ['tag1', 'tag2', 'tag3'] };

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });
  });

  describe('format validation', () => {
    it('should validate date-time format', () => {
      const schemaFile = path.join(TEST_DIR, 'datetime.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' }
        }
      };

      const data = { timestamp: '2025-11-05T12:00:00Z' };

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });

    it('should validate uuid format', () => {
      const schemaFile = path.join(TEST_DIR, 'uuid.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      };

      const data = { id: '550e8400-e29b-41d4-a716-446655440000' };

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });

    it('should validate valid NHS number format', () => {
      const schemaFile = path.join(TEST_DIR, 'nhs.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          nhsNumber: { type: 'string', format: 'nhs-number' }
        }
      };

      const data = { nhsNumber: '9434765919' }; // Valid NHS number

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });

    it('should reject invalid NHS number format', () => {
      const schemaFile = path.join(TEST_DIR, 'nhs.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          nhsNumber: { type: 'string', format: 'nhs-number' }
        }
      };

      const data = { nhsNumber: '1234567890' }; // Invalid NHS number (wrong checksum)

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('should validate NHS number with spaces', () => {
      const schemaFile = path.join(TEST_DIR, 'nhs.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          nhsNumber: { type: 'string', format: 'nhs-number' }
        }
      };

      const data = { nhsNumber: '943 476 5919' }; // Valid NHS number with spaces

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });
  });

  describe('enum validation', () => {
    it('should validate value in enum', () => {
      const schemaFile = path.join(TEST_DIR, 'enum.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive', 'pending'] }
        }
      };

      const data = { status: 'active' };

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });

    it('should reject value not in enum', () => {
      const schemaFile = path.join(TEST_DIR, 'enum.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive', 'pending'] }
        }
      };

      const data = { status: 'unknown' };

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
          stdio: 'pipe'
        });
      }).toThrow();
    });
  });

  describe('pattern validation', () => {
    it('should validate string matching pattern', () => {
      const schemaFile = path.join(TEST_DIR, 'pattern.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' }
        }
      };

      const data = { email: 'test@example.com' };

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });

    it('should reject string not matching pattern', () => {
      const schemaFile = path.join(TEST_DIR, 'pattern.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' }
        }
      };

      const data = { email: 'not-an-email' };

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
          stdio: 'pipe'
        });
      }).toThrow();
    });
  });

  describe('YAML schema support', () => {
    it('should validate data against YAML schema', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.yaml');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schemaYaml = `
type: object
properties:
  name:
    type: string
  count:
    type: number
required:
  - name
`;

      const data = {
        name: 'Test',
        count: 42
      };

      fs.writeFileSync(schemaFile, schemaYaml);
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });
  });

  describe('$ref handling with local files', () => {
    it('should validate data with schema references', () => {
      const defsFile = path.join(TEST_DIR, 'definitions.schema.json');
      const schemaFile = path.join(TEST_DIR, 'main.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const definitions = {
        $id: 'definitions.schema.json',
        definitions: {
          Person: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' }
            },
            required: ['name']
          }
        }
      };

      const schema = {
        $id: 'main.schema.json',
        type: 'object',
        properties: {
          person: { $ref: 'definitions.schema.json#/definitions/Person' }
        }
      };

      const data = {
        person: {
          name: 'Alice',
          age: 25
        }
      };

      fs.writeFileSync(defsFile, JSON.stringify(definitions, null, 2));
      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });
  });

  describe('base directory option', () => {
    it('should use --base option for schema resolution', () => {
      const baseDir = path.join(TEST_DIR, 'schemas');
      fs.mkdirSync(baseDir, { recursive: true });

      const schemaFile = path.join(baseDir, 'test.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          value: { type: 'string' }
        }
      };

      const data = { value: 'test' };

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = execSync(
        `node ${SCRIPT_PATH} --base ${baseDir} ${schemaFile} ${dataFile}`,
        { stdio: 'pipe', encoding: 'utf-8' }
      );

      expect(result).toContain('Valid!');
    });
  });

  describe('error handling', () => {
    it('should handle non-existent schema file', () => {
      const schemaFile = path.join(TEST_DIR, 'nonexistent.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(dataFile, JSON.stringify({}));

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('should handle non-existent data file', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.json');
      const dataFile = path.join(TEST_DIR, 'nonexistent.json');

      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'object' }));

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('should handle invalid JSON in data file', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'object' }));
      fs.writeFileSync(dataFile, '{ invalid json }');

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('should handle invalid JSON in schema file', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      fs.writeFileSync(schemaFile, '{ invalid json }');
      fs.writeFileSync(dataFile, JSON.stringify({}));

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
          stdio: 'pipe'
        });
      }).toThrow();
    });
  });

  describe('const validation', () => {
    it('should validate const value', () => {
      const schemaFile = path.join(TEST_DIR, 'const.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          version: { type: 'string', const: '1.0' }
        }
      };

      const data = { version: '1.0' };

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      const result = execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      expect(result).toContain('Valid!');
    });

    it('should reject wrong const value', () => {
      const schemaFile = path.join(TEST_DIR, 'const.schema.json');
      const dataFile = path.join(TEST_DIR, 'data.json');

      const schema = {
        type: 'object',
        properties: {
          version: { type: 'string', const: '1.0' }
        }
      };

      const data = { version: '2.0' };

      fs.writeFileSync(schemaFile, JSON.stringify(schema));
      fs.writeFileSync(dataFile, JSON.stringify(data));

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${schemaFile} ${dataFile}`, {
          stdio: 'pipe'
        });
      }).toThrow();
    });
  });
});
