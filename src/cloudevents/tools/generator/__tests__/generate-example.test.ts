/**
 * Tests for generate-example.ts
 * Tests example generation from JSON schemas
 */

import { beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import http from 'http';

const SCRIPT_PATH = path.join(__dirname, '..', 'example-generator', 'generate-example.ts');
const TEST_DIR = path.join(__dirname, 'temp-generate-example-test');
// Use npx to run ts-node, which will find it in the root workspace
const TS_NODE_CMD = 'npx ts-node';

describe('generate-example.ts', () => {
  let server: http.Server | undefined;
  let serverPort: number;

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

    // Close server if running
    if (server) {
      server.close();
    }
  });

  describe('command line argument handling', () => {
    it('should display usage when no arguments provided', () => {
      expect(() => {
        execSync(`${TS_NODE_CMD} ${SCRIPT_PATH}`, { stdio: 'pipe', encoding: 'utf-8' });
      }).toThrow();
    });

    it('should display usage when only one argument provided', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.json');
      fs.writeFileSync(schemaFile, JSON.stringify({ type: 'object' }));

      expect(() => {
        execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile}`, { stdio: 'pipe', encoding: 'utf-8' });
      }).toThrow();
    });
  });

  describe('cache management', () => {
    it('should handle --clear-cache command', () => {
      const result = execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} --clear-cache`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      expect(result).toBeTruthy();
    });

    it('should handle --cache-info command', () => {
      const result = execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} --cache-info`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      expect(result).toBeTruthy();
    });
  });

  describe('simple schema example generation', () => {
    it('should generate example from simple object schema', () => {
      const schemaFile = path.join(TEST_DIR, 'simple-schema.json');
      const outputFile = path.join(TEST_DIR, 'simple-output.json');
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      expect(fs.existsSync(outputFile)).toBe(true);
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      expect(output).toHaveProperty('name');
      expect(typeof output.name).toBe('string');
    });

    it('should generate example with nested objects', () => {
      const schemaFile = path.join(TEST_DIR, 'nested-schema.json');
      const outputFile = path.join(TEST_DIR, 'nested-output.json');
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
                  street: { type: 'string' },
                  city: { type: 'string' }
                }
              }
            }
          }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      expect(fs.existsSync(outputFile)).toBe(true);
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      expect(output).toHaveProperty('person');
      expect(output.person).toHaveProperty('address');
    });

    it('should generate example with array properties', () => {
      const schemaFile = path.join(TEST_DIR, 'array-schema.json');
      const outputFile = path.join(TEST_DIR, 'array-output.json');
      const schema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' }
          },
          scores: {
            type: 'array',
            items: { type: 'number' }
          }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      expect(fs.existsSync(outputFile)).toBe(true);
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      expect(Array.isArray(output.tags)).toBe(true);
      expect(Array.isArray(output.scores)).toBe(true);
    });
  });

  describe('output directory creation', () => {
    it('should create output directory if it does not exist', () => {
      const schemaFile = path.join(TEST_DIR, 'schema.json');
      const outputDir = path.join(TEST_DIR, 'nested', 'output');
      const outputFile = path.join(outputDir, 'output.json');
      const schema = {
        type: 'object',
        properties: {
          value: { type: 'string' }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));

      expect(fs.existsSync(outputDir)).toBe(false);

      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(outputFile)).toBe(true);
    });
  });

  describe('CloudEvents schema handling', () => {
    it('should generate CloudEvents compliant example', () => {
      const schemaFile = path.join(TEST_DIR, 'cloudevents-schema.json');
      const outputFile = path.join(TEST_DIR, 'cloudevents-output.json');
      const schema = {
        type: 'object',
        properties: {
          specversion: { type: 'string', const: '1.0' },
          type: { type: 'string' },
          source: { type: 'string', pattern: '^/[a-z]+/[a-f0-9-]+$' },
          id: { type: 'string', format: 'uuid' },
          time: { type: 'string', format: 'date-time' },
          data: { type: 'object' }
        },
        required: ['specversion', 'type', 'source', 'id']
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      expect(fs.existsSync(outputFile)).toBe(true);
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      // Verify CloudEvents required fields
      expect(output.specversion).toBe('1.0');
      expect(output).toHaveProperty('type');
      expect(output).toHaveProperty('source');
      expect(output).toHaveProperty('id');

      // Verify UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(output.id)).toBe(true);
    });

    it('should generate valid traceparent field', () => {
      const schemaFile = path.join(TEST_DIR, 'trace-schema.json');
      const outputFile = path.join(TEST_DIR, 'trace-output.json');
      const schema = {
        type: 'object',
        properties: {
          specversion: { type: 'string' },
          type: { type: 'string' },
          source: { type: 'string' },
          id: { type: 'string' },
          traceparent: { type: 'string' }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      // Verify traceparent format: 00-<32hex>-<16hex>-<2hex>
      const traceparentRegex = /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;
      expect(traceparentRegex.test(output.traceparent)).toBe(true);
    });

    it('should generate coherent severity pairs', () => {
      const schemaFile = path.join(TEST_DIR, 'severity-schema.json');
      const outputFile = path.join(TEST_DIR, 'severity-output.json');
      const schema = {
        type: 'object',
        properties: {
          specversion: { type: 'string' },
          type: { type: 'string' },
          source: { type: 'string' },
          id: { type: 'string' },
          severitytext: { type: 'string', enum: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] },
          severitynumber: { type: 'number', minimum: 0, maximum: 5 }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      // Verify severity coherence
      const severityMap: Record<string, number> = {
        'TRACE': 0,
        'DEBUG': 1,
        'INFO': 2,
        'WARN': 3,
        'ERROR': 4,
        'FATAL': 5
      };

      expect(severityMap[output.severitytext]).toBe(output.severitynumber);
    });
  });

  describe('schema with $ref handling', () => {
    it('should dereference local file $refs', () => {
      const definitionsFile = path.join(TEST_DIR, 'definitions.json');
      const schemaFile = path.join(TEST_DIR, 'main-schema.json');
      const outputFile = path.join(TEST_DIR, 'ref-output.json');

      const definitions = {
        definitions: {
          Person: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' }
            }
          }
        }
      };

      const schema = {
        type: 'object',
        properties: {
          person: { $ref: './definitions.json#/definitions/Person' }
        }
      };

      fs.writeFileSync(definitionsFile, JSON.stringify(definitions, null, 2));
      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));

      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      expect(fs.existsSync(outputFile)).toBe(true);
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      expect(output).toHaveProperty('person');
      expect(output.person).toHaveProperty('name');
    });
  });

  describe('pattern constraint handling', () => {
    it('should generate strings matching pattern constraints', () => {
      const schemaFile = path.join(TEST_DIR, 'pattern-schema.json');
      const outputFile = path.join(TEST_DIR, 'pattern-output.json');
      const schema = {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
          },
          phone: {
            type: 'string',
            pattern: '^\\+?[1-9]\\d{1,14}$'
          }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      // Verify patterns match
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;

      if (output.email) {
        expect(emailRegex.test(output.email)).toBe(true);
      }
      if (output.phone) {
        expect(phoneRegex.test(output.phone)).toBe(true);
      }
    });
  });

  describe('enum handling', () => {
    it('should generate values from enum constraints', () => {
      const schemaFile = path.join(TEST_DIR, 'enum-schema.json');
      const outputFile = path.join(TEST_DIR, 'enum-output.json');
      const schema = {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending']
          },
          priority: {
            type: 'number',
            enum: [1, 2, 3, 4, 5]
          }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      if (output.status) {
        expect(['active', 'inactive', 'pending']).toContain(output.status);
      }
      if (output.priority) {
        expect([1, 2, 3, 4, 5]).toContain(output.priority);
      }
    });
  });

  describe('data field handling', () => {
    it('should ensure data field is present in CloudEvents', () => {
      const schemaFile = path.join(TEST_DIR, 'data-field-schema.json');
      const outputFile = path.join(TEST_DIR, 'data-field-output.json');
      const schema = {
        type: 'object',
        properties: {
          specversion: { type: 'string' },
          type: { type: 'string' },
          source: { type: 'string' },
          id: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              count: { type: 'number' }
            }
          }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      expect(output).toHaveProperty('data');
      expect(typeof output.data).toBe('object');
    });

    it('should create empty data object if missing', () => {
      const schemaFile = path.join(TEST_DIR, 'no-data-schema.json');
      const outputFile = path.join(TEST_DIR, 'no-data-output.json');
      const schema = {
        type: 'object',
        properties: {
          specversion: { type: 'string' },
          type: { type: 'string' },
          source: { type: 'string' },
          id: { type: 'string' }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      // Script enforces data field for CloudEvents
      expect(output).toHaveProperty('data');
      expect(typeof output.data).toBe('object');
    });
  });

  describe('time and date handling', () => {
    it('should generate valid ISO timestamps', () => {
      const schemaFile = path.join(TEST_DIR, 'time-schema.json');
      const outputFile = path.join(TEST_DIR, 'time-output.json');
      const schema = {
        type: 'object',
        properties: {
          specversion: { type: 'string' },
          type: { type: 'string' },
          source: { type: 'string' },
          id: { type: 'string' },
          time: { type: 'string', format: 'date-time' },
          recordedtime: { type: 'string', format: 'date-time' }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      // Verify ISO 8601 format
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(isoRegex.test(output.time)).toBe(true);
      expect(isoRegex.test(output.recordedtime)).toBe(true);

      // Verify recordedtime >= time
      const timeDate = new Date(output.time);
      const recordedDate = new Date(output.recordedtime);
      expect(recordedDate.getTime()).toBeGreaterThanOrEqual(timeDate.getTime());
    });
  });

  describe('NHS number handling', () => {
    it('should generate valid NHS numbers', () => {
      const schemaFile = path.join(TEST_DIR, 'nhs-schema.json');
      const outputFile = path.join(TEST_DIR, 'nhs-output.json');
      const schema = {
        type: 'object',
        properties: {
          specversion: { type: 'string' },
          type: { type: 'string' },
          source: { type: 'string' },
          id: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              patient: {
                type: 'object',
                properties: {
                  nhsNumber: {
                    type: 'string',
                    pattern: '^[0-9]{10}$'
                  }
                }
              }
            }
          }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));
      execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
        stdio: 'pipe'
      });

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      if (output.data?.patient?.nhsNumber) {
        // Should be set to the known valid NHS number
        expect(output.data.patient.nhsNumber).toBe('9434765919');
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid schema gracefully', () => {
      const schemaFile = path.join(TEST_DIR, 'invalid-schema.json');
      const outputFile = path.join(TEST_DIR, 'invalid-output.json');

      // Write actually invalid JSON (unclosed brace)
      fs.writeFileSync(schemaFile, '{ "type": "object"');

      expect(() => {
        execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
          stdio: 'pipe'
        });
      }).toThrow();
    });

    it('should handle non-existent schema file', () => {
      const schemaFile = path.join(TEST_DIR, 'nonexistent.json');
      const outputFile = path.join(TEST_DIR, 'output.json');

      expect(() => {
        execSync(`${TS_NODE_CMD} ${SCRIPT_PATH} ${schemaFile} ${outputFile}`, {
          stdio: 'pipe'
        });
      }).toThrow();
    });
  });
});
