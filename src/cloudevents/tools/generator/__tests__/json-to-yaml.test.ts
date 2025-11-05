/**
 * Tests for json-to-yaml.cjs
 * Tests JSON to YAML conversion functionality
 */

import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import yaml from 'js-yaml';

const SCRIPT_PATH = path.join(__dirname, '..', 'json-to-yaml.cjs');
const TEST_DIR = path.join(__dirname, 'temp-json-to-yaml-test');

describe('json-to-yaml.cjs', () => {
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

  describe('basic conversion', () => {
    it('should convert simple JSON object to YAML', () => {
      const inputFile = path.join(TEST_DIR, 'simple.json');
      const outputFile = path.join(TEST_DIR, 'simple.yaml');
      const testData = {
        name: 'test',
        value: 123,
        nested: {
          key: 'value'
        }
      };

      // Write input JSON
      fs.writeFileSync(inputFile, JSON.stringify(testData, null, 2));

      // Run conversion
      execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`);

      // Verify output exists
      expect(fs.existsSync(outputFile)).toBe(true);

      // Verify content
      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });

    it('should convert JSON array to YAML', () => {
      const inputFile = path.join(TEST_DIR, 'array.json');
      const outputFile = path.join(TEST_DIR, 'array.yaml');
      const testData = [
        { id: 1, name: 'first' },
        { id: 2, name: 'second' }
      ];

      fs.writeFileSync(inputFile, JSON.stringify(testData, null, 2));
      execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });

    it('should handle special characters in strings', () => {
      const inputFile = path.join(TEST_DIR, 'special.json');
      const outputFile = path.join(TEST_DIR, 'special.yaml');
      const testData = {
        description: 'Line 1\nLine 2',
        path: '/path/to/resource',
        special: "String with 'quotes' and \"double quotes\""
      };

      fs.writeFileSync(inputFile, JSON.stringify(testData));
      execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });
  });

  describe('nested structures', () => {
    it('should convert deeply nested JSON to YAML', () => {
      const inputFile = path.join(TEST_DIR, 'nested.json');
      const outputFile = path.join(TEST_DIR, 'nested.yaml');
      const testData = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep'
              }
            }
          }
        }
      };

      fs.writeFileSync(inputFile, JSON.stringify(testData));
      execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });

    it('should convert mixed array and object structures', () => {
      const inputFile = path.join(TEST_DIR, 'mixed.json');
      const outputFile = path.join(TEST_DIR, 'mixed.yaml');
      const testData = {
        items: [
          { type: 'A', values: [1, 2, 3] },
          { type: 'B', values: [4, 5, 6] }
        ],
        metadata: {
          tags: ['tag1', 'tag2'],
          info: { author: 'test' }
        }
      };

      fs.writeFileSync(inputFile, JSON.stringify(testData));
      execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });
  });

  describe('output directory handling', () => {
    it('should create output directory if it does not exist', () => {
      const inputFile = path.join(TEST_DIR, 'input.json');
      const outputDir = path.join(TEST_DIR, 'nested', 'output');
      const outputFile = path.join(outputDir, 'output.yaml');
      const testData = { test: 'value' };

      fs.writeFileSync(inputFile, JSON.stringify(testData));

      // Output directory should not exist yet
      expect(fs.existsSync(outputDir)).toBe(false);

      execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`);

      // Output directory should now exist
      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(outputFile)).toBe(true);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });
  });

  describe('error handling', () => {
    it('should exit with error code when no arguments provided', () => {
      expect(() => {
        execSync(`node ${SCRIPT_PATH}`, { stdio: 'pipe' });
      }).toThrow();
    });

    it('should exit with error code when only one argument provided', () => {
      const inputFile = path.join(TEST_DIR, 'input.json');
      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${inputFile}`, { stdio: 'pipe' });
      }).toThrow();
    });

    it('should handle invalid JSON gracefully', () => {
      const inputFile = path.join(TEST_DIR, 'invalid.json');
      const outputFile = path.join(TEST_DIR, 'output.yaml');

      // Write invalid JSON
      fs.writeFileSync(inputFile, '{ invalid json }');

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`, { stdio: 'pipe' });
      }).toThrow();

      // Output file should not be created
      expect(fs.existsSync(outputFile)).toBe(false);
    });

    it('should handle non-existent input file', () => {
      const inputFile = path.join(TEST_DIR, 'nonexistent.json');
      const outputFile = path.join(TEST_DIR, 'output.yaml');

      expect(() => {
        execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`, { stdio: 'pipe' });
      }).toThrow();
    });
  });

  describe('JSON schema conversion', () => {
    it('should convert JSON Schema to YAML', () => {
      const inputFile = path.join(TEST_DIR, 'schema.json');
      const outputFile = path.join(TEST_DIR, 'schema.yaml');
      const schemaData = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the item'
          },
          count: {
            type: 'integer',
            minimum: 0
          }
        },
        required: ['name']
      };

      fs.writeFileSync(inputFile, JSON.stringify(schemaData, null, 2));
      execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(schemaData);
    });
  });

  describe('edge cases', () => {
    it('should handle empty JSON object', () => {
      const inputFile = path.join(TEST_DIR, 'empty-object.json');
      const outputFile = path.join(TEST_DIR, 'empty-object.yaml');
      const testData = {};

      fs.writeFileSync(inputFile, JSON.stringify(testData));
      execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });

    it('should handle empty JSON array', () => {
      const inputFile = path.join(TEST_DIR, 'empty-array.json');
      const outputFile = path.join(TEST_DIR, 'empty-array.yaml');
      const testData: any[] = [];

      fs.writeFileSync(inputFile, JSON.stringify(testData));
      execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });

    it('should handle null values', () => {
      const inputFile = path.join(TEST_DIR, 'nulls.json');
      const outputFile = path.join(TEST_DIR, 'nulls.yaml');
      const testData = {
        value: null,
        nested: { key: null }
      };

      fs.writeFileSync(inputFile, JSON.stringify(testData));
      execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });

    it('should handle boolean values', () => {
      const inputFile = path.join(TEST_DIR, 'booleans.json');
      const outputFile = path.join(TEST_DIR, 'booleans.yaml');
      const testData = {
        isActive: true,
        isDeleted: false
      };

      fs.writeFileSync(inputFile, JSON.stringify(testData));
      execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });

    it('should handle numeric edge cases', () => {
      const inputFile = path.join(TEST_DIR, 'numbers.json');
      const outputFile = path.join(TEST_DIR, 'numbers.yaml');
      const testData = {
        zero: 0,
        negative: -42,
        float: 3.14,
        large: 999999999
      };

      fs.writeFileSync(inputFile, JSON.stringify(testData));
      execSync(`node ${SCRIPT_PATH} ${inputFile} ${outputFile}`);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });
  });
});
