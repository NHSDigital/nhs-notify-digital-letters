/**
 * Unit tests for ExampleGenerator class
 * Tests the core example generation logic by importing the class directly
 */

import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const GENERATE_EXAMPLE_SCRIPT = path.join(__dirname, '../example-generator/generate-example.ts');
const CACHE_DIR = path.join(__dirname, '../../cache/.cache');
import { ExampleGenerator } from '../example-generator/example-generator.ts';

const TEST_DIR = path.join(__dirname, 'temp-example-generator-test');

describe('ExampleGenerator', () => {
  let generator: ExampleGenerator;

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    // Create generator instance with verbose=false for cleaner test output
    generator = new ExampleGenerator({ verbose: false });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      const gen = new ExampleGenerator();
      expect(gen).toBeInstanceOf(ExampleGenerator);
    });

    it('should create an instance with custom options', () => {
      const gen = new ExampleGenerator({ verbose: false });
      expect(gen).toBeInstanceOf(ExampleGenerator);
    });
  });

  describe('generate() - basic schema handling', () => {
    it('should generate example from simple object schema', async () => {
      const schemaFile = path.join(TEST_DIR, 'simple-schema.json');
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      expect(result.example).toHaveProperty('name');
      expect(typeof result.example.name).toBe('string');
    });

    it('should generate example with nested objects', async () => {
      const schemaFile = path.join(TEST_DIR, 'nested-schema.json');
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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      expect(result.example).toHaveProperty('person');
      expect(result.example.person).toHaveProperty('address');
    });

    it('should generate example with array properties', async () => {
      const schemaFile = path.join(TEST_DIR, 'array-schema.json');
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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.example.tags)).toBe(true);
      expect(Array.isArray(result.example.scores)).toBe(true);
    });
  });

  describe('generate() - CloudEvents handling', () => {
    it('should generate CloudEvents compliant example', async () => {
      const schemaFile = path.join(TEST_DIR, 'cloudevents-schema.json');
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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      const { example } = result;

      // Verify CloudEvents required fields
      expect(example.specversion).toBe('1.0');
      expect(example).toHaveProperty('type');
      expect(example).toHaveProperty('source');
      expect(example).toHaveProperty('id');

      // Verify UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(example.id)).toBe(true);
    });

    it('should generate valid traceparent field', async () => {
      const schemaFile = path.join(TEST_DIR, 'trace-schema.json');
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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);

      // Verify traceparent format: 00-<32hex>-<16hex>-<2hex>
      const traceparentRegex = /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;
      expect(traceparentRegex.test(result.example.traceparent)).toBe(true);
    });

    it('should generate coherent severity pairs', async () => {
      const schemaFile = path.join(TEST_DIR, 'severity-schema.json');
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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);

      // Verify severity coherence
      const severityMap: Record<string, number> = {
        'TRACE': 0,
        'DEBUG': 1,
        'INFO': 2,
        'WARN': 3,
        'ERROR': 4,
        'FATAL': 5
      };

      expect(severityMap[result.example.severitytext]).toBe(result.example.severitynumber);
    });

    it('should generate valid ISO timestamps', async () => {
      const schemaFile = path.join(TEST_DIR, 'time-schema.json');
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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      const { example } = result;

      // Verify ISO 8601 format
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(isoRegex.test(example.time)).toBe(true);
      expect(isoRegex.test(example.recordedtime)).toBe(true);

      // Verify recordedtime >= time
      const timeDate = new Date(example.time);
      const recordedDate = new Date(example.recordedtime);
      expect(recordedDate.getTime()).toBeGreaterThanOrEqual(timeDate.getTime());
    });

    it('should ensure data field is present in CloudEvents', async () => {
      const schemaFile = path.join(TEST_DIR, 'data-field-schema.json');
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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      expect(result.example).toHaveProperty('data');
      expect(typeof result.example.data).toBe('object');
    });

    it('should create empty data object if missing', async () => {
      const schemaFile = path.join(TEST_DIR, 'no-data-schema.json');
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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      expect(result.example).toHaveProperty('data');
      expect(typeof result.example.data).toBe('object');
    });
  });

  describe('generate() - data classification', () => {
    it('should set default data classification fields', async () => {
      const schemaFile = path.join(TEST_DIR, 'classification-schema.json');
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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      expect(result.example.dataclassification).toBe('restricted');
      expect(result.example.dataregulation).toBe('ISO-27001');
      expect(result.example.datacategory).toBe('sensitive');
      expect(result.example.datacontenttype).toBe('application/json');
    });
  });

  describe('generate() - NHS number handling', () => {
    it('should generate valid NHS numbers', async () => {
      const schemaFile = path.join(TEST_DIR, 'nhs-schema.json');
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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      if (result.example.data?.patient?.nhsNumber) {
        // Should be set to the known valid NHS number
        expect(result.example.data.patient.nhsNumber).toBe('9434765919');
      }
    });

    it('should handle nested nhsNumber fields', async () => {
      const schemaFile = path.join(TEST_DIR, 'nested-nhs-schema.json');
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
              records: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    nhsNumber: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      if (result.example.data?.records && Array.isArray(result.example.data.records)) {
        result.example.data.records.forEach((record: any) => {
          if (record.nhsNumber) {
            expect(record.nhsNumber).toBe('9434765919');
          }
        });
      }
    });
  });

  describe('generate() - pattern constraints', () => {
    it('should generate strings matching pattern constraints', async () => {
      const schemaFile = path.join(TEST_DIR, 'pattern-schema.json');
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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);

      // Verify patterns match
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;

      if (result.example.email) {
        expect(emailRegex.test(result.example.email)).toBe(true);
      }
      if (result.example.phone) {
        expect(phoneRegex.test(result.example.phone)).toBe(true);
      }
    });
  });

  describe('generate() - enum handling', () => {
    it('should generate values from enum constraints', async () => {
      const schemaFile = path.join(TEST_DIR, 'enum-schema.json');
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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);

      if (result.example.status) {
        expect(['active', 'inactive', 'pending']).toContain(result.example.status);
      }
      if (result.example.priority) {
        expect([1, 2, 3, 4, 5]).toContain(result.example.priority);
      }
    });
  });

  describe('generate() - schema with $ref handling', () => {
    it('should dereference local file $refs', async () => {
      const definitionsFile = path.join(TEST_DIR, 'definitions.json');
      const schemaFile = path.join(TEST_DIR, 'main-schema.json');

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

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      expect(result.example).toHaveProperty('person');
      expect(result.example.person).toHaveProperty('name');
    });
  });

  describe('generate() - advanced CloudEvents features', () => {
    it('should handle schemas with allOf conditionals', async () => {
      const schemaFile = path.join(TEST_DIR, 'conditional-schema.json');
      const schema = {
        type: 'object',
        properties: {
          specversion: { type: 'string' },
          type: { type: 'string' },
          source: { type: 'string', pattern: '^/domain/[a-z]+' },
          id: { type: 'string' },
          subject: { type: 'string' }
        },
        allOf: [
          {
            if: {
              properties: {
                source: { pattern: '^/domain/test' }
              }
            },
            then: {
              properties: {
                subject: { pattern: '^/subject/test/[0-9]+$' }
              }
            }
          }
        ]
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      expect(result.example).toHaveProperty('subject');
    });

    it('should handle schemas with nested allOf arrays', async () => {
      const schemaFile = path.join(TEST_DIR, 'nested-allof-schema.json');
      const schema = {
        type: 'object',
        properties: {
          specversion: { type: 'string' },
          type: { type: 'string' },
          source: { type: 'string' },
          id: { type: 'string' }
        },
        allOf: [
          {
            properties: {
              data: { type: 'object' }
            }
          },
          {
            allOf: [
              {
                if: {
                  properties: {
                    source: { pattern: '^/test' }
                  }
                },
                then: {
                  properties: {
                    subject: { pattern: '^/nested/[a-z]+$' }
                  }
                }
              }
            ]
          }
        ]
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      expect(result.example).toBeDefined();
    });

    it('should handle data field generated separately', async () => {
      const schemaFile = path.join(TEST_DIR, 'separate-data-schema.json');
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
              timestamp: { type: 'number' }
            },
            required: ['message']
          }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      expect(result.example).toHaveProperty('data');
      expect(typeof result.example.data).toBe('object');
      // Data should have been generated (either inline or separately)
      expect(result.example.data).toBeDefined();
    });

    it('should handle subject with $ref (no specific pattern)', async () => {
      const schemaFile = path.join(TEST_DIR, 'subject-ref-schema.json');
      const schema = {
        type: 'object',
        properties: {
          specversion: { type: 'string' },
          type: { type: 'string' },
          source: { type: 'string' },
          id: { type: 'string' },
          subject: { $ref: '#/definitions/SubjectType' }
        },
        definitions: {
          SubjectType: { type: 'string' }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      expect(result.example).toHaveProperty('subject');
    });

    it('should handle subject generation from source pattern', async () => {
      const schemaFile = path.join(TEST_DIR, 'source-pattern-schema.json');
      const schema = {
        type: 'object',
        properties: {
          specversion: { type: 'string' },
          type: { type: 'string' },
          source: {
            type: 'string',
            pattern: '^/customer/[a-f0-9-]+/order/[a-f0-9-]+$'
          },
          id: { type: 'string' },
          subject: { type: 'string' }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(true);
      expect(result.example.source).toMatch(/^\/customer\/[a-f0-9-]+\/order\/[a-f0-9-]+$/);
    });
  });

  describe('generate() - error handling', () => {
    it('should handle invalid schema gracefully', async () => {
      const schemaFile = path.join(TEST_DIR, 'invalid-schema.json');

      // Write actually invalid JSON (unclosed brace)
      fs.writeFileSync(schemaFile, '{ "type": "object"');

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle non-existent schema file', async () => {
      const schemaFile = path.join(TEST_DIR, 'nonexistent.json');

      const result = await generator.generate(schemaFile);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('generateToFile()', () => {
    it('should generate example and write to file', async () => {
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

      const success = await generator.generateToFile(schemaFile, outputFile);

      expect(success).toBe(true);
      expect(fs.existsSync(outputFile)).toBe(true);

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      expect(output).toHaveProperty('name');
      expect(typeof output.name).toBe('string');
    });

    it('should create output directory if it does not exist', async () => {
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

      const success = await generator.generateToFile(schemaFile, outputFile);

      expect(success).toBe(true);
      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(outputFile)).toBe(true);
    });

    it('should return false on generation failure', async () => {
      const schemaFile = path.join(TEST_DIR, 'invalid.json');
      const outputFile = path.join(TEST_DIR, 'output.json');

      fs.writeFileSync(schemaFile, '{ "type": "object"');

      const success = await generator.generateToFile(schemaFile, outputFile);

      expect(success).toBe(false);
      expect(fs.existsSync(outputFile)).toBe(false);
    });
  });
});
