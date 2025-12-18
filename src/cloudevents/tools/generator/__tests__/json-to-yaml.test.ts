/**
 * Tests for json-to-yaml TypeScript modules
 * Tests JSON to YAML conversion functionality including:
 * - JsonToYamlConverter class (core logic)
 * - handleCli function (CLI interface)
 *
 * NOTE: Tests use the TypeScript modules directly to enable jest code coverage instrumentation.
 */

import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { JsonToYamlConverter } from '../json-to-yaml/json-to-yaml-converter.ts';
import { handleCli } from '../json-to-yaml/json-to-yaml-cli.ts';

const TEST_DIR = path.join(__dirname, 'temp-json-to-yaml-test');

/**
 * Helper function for backward compatibility with old tests
 * Wraps the JsonToYamlConverter for simple boolean success return
 */
function convertJsonToYaml(inputFile: string, outputFile: string): boolean {
  const converter = new JsonToYamlConverter();
  const result = converter.convert(inputFile, outputFile);
  return result.success;
}

describe('json-to-yaml integration tests', () => {
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
      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(true);

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
      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(true);

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
      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(true);

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
      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(true);

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
      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(true);

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

      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(true);

      // Output directory should now exist
      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(outputFile)).toBe(true);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });
  });

  describe('error handling', () => {
    it('should return false for invalid JSON', () => {
      const inputFile = path.join(TEST_DIR, 'invalid.json');
      const outputFile = path.join(TEST_DIR, 'output.yaml');

      // Write invalid JSON
      fs.writeFileSync(inputFile, '{ invalid json }');

      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(false);

      // Output file should not be created
      expect(fs.existsSync(outputFile)).toBe(false);
    });

    it('should return false for non-existent input file', () => {
      const inputFile = path.join(TEST_DIR, 'nonexistent.json');
      const outputFile = path.join(TEST_DIR, 'output.yaml');

      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(false);
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
      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(true);

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
      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(true);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });

    it('should handle empty JSON array', () => {
      const inputFile = path.join(TEST_DIR, 'empty-array.json');
      const outputFile = path.join(TEST_DIR, 'empty-array.yaml');
      const testData: any[] = [];

      fs.writeFileSync(inputFile, JSON.stringify(testData));
      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(true);

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
      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(true);

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
      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(true);

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
      const success = convertJsonToYaml(inputFile, outputFile);
      expect(success).toBe(true);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsedYaml = yaml.load(yamlContent);
      expect(parsedYaml).toEqual(testData);
    });
  });
});

// ============================================================================
// JsonToYamlConverter Class Tests
// ============================================================================

describe('JsonToYamlConverter', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('constructor and options', () => {
    it('should create converter with default options', () => {
      const converter = new JsonToYamlConverter();
      const options = converter.getOptions();

      expect(options.lineWidth).toBe(-1);
      expect(options.noRefs).toBe(true);
      expect(options.sortKeys).toBe(false);
      expect(options.quotingType).toBe('"');
      expect(options.forceQuotes).toBe(false);
    });

    it('should create converter with custom options', () => {
      const converter = new JsonToYamlConverter({
        lineWidth: 80,
        sortKeys: true,
        forceQuotes: true
      });
      const options = converter.getOptions();

      expect(options.lineWidth).toBe(80);
      expect(options.sortKeys).toBe(true);
      expect(options.forceQuotes).toBe(true);
      // Defaults should still be applied for unspecified options
      expect(options.noRefs).toBe(true);
      expect(options.quotingType).toBe('"');
    });

    it('should not allow modification of returned options', () => {
      const converter = new JsonToYamlConverter();
      const options = converter.getOptions();

      // TypeScript should prevent this, but test at runtime
      expect(() => {
        (options as any).lineWidth = 100;
      }).not.toThrow();

      // Original options should be unchanged
      const freshOptions = converter.getOptions();
      expect(freshOptions.lineWidth).toBe(-1);
    });
  });

  describe('convert method', () => {
    it('should successfully convert JSON file to YAML', () => {
      const inputFile = path.join(TEST_DIR, 'input.json');
      const outputFile = path.join(TEST_DIR, 'output.yaml');
      const testData = { key: 'value', number: 42 };

      fs.writeFileSync(inputFile, JSON.stringify(testData));

      const converter = new JsonToYamlConverter();
      const result = converter.convert(inputFile, outputFile);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(fs.existsSync(outputFile)).toBe(true);

      const yamlContent = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(yamlContent);
      expect(parsed).toEqual(testData);
    });

    it('should return error for non-existent input file', () => {
      const converter = new JsonToYamlConverter();
      const result = converter.convert('nonexistent.json', 'output.yaml');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('ENOENT');
    });

    it('should return error for invalid JSON', () => {
      const inputFile = path.join(TEST_DIR, 'invalid.json');
      const outputFile = path.join(TEST_DIR, 'output.yaml');

      fs.writeFileSync(inputFile, '{ invalid json }');

      const converter = new JsonToYamlConverter();
      const result = converter.convert(inputFile, outputFile);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(fs.existsSync(outputFile)).toBe(false);
    });

    it('should create output directory if it does not exist', () => {
      const inputFile = path.join(TEST_DIR, 'input.json');
      const outputDir = path.join(TEST_DIR, 'nested', 'deep', 'path');
      const outputFile = path.join(outputDir, 'output.yaml');
      const testData = { test: 'data' };

      fs.writeFileSync(inputFile, JSON.stringify(testData));
      expect(fs.existsSync(outputDir)).toBe(false);

      const converter = new JsonToYamlConverter();
      const result = converter.convert(inputFile, outputFile);

      expect(result.success).toBe(true);
      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(outputFile)).toBe(true);
    });
  });

  describe('convertData method', () => {
    it('should convert simple object to YAML string', () => {
      const converter = new JsonToYamlConverter();
      const data = { name: 'test', value: 123 };
      const yamlString = converter.convertData(data);

      expect(yamlString).toContain('name: test');
      expect(yamlString).toContain('value: 123');

      const parsed = yaml.load(yamlString);
      expect(parsed).toEqual(data);
    });

    it('should convert array to YAML string', () => {
      const converter = new JsonToYamlConverter();
      const data = [1, 2, 3];
      const yamlString = converter.convertData(data);

      const parsed = yaml.load(yamlString);
      expect(parsed).toEqual(data);
    });

    it('should handle null and undefined', () => {
      const converter = new JsonToYamlConverter();

      const nullYaml = converter.convertData(null);
      expect(nullYaml.trim()).toBe('null');

      const undefinedYaml = converter.convertData(undefined);
      expect(undefinedYaml.trim()).toBe('');
    });

    it('should respect custom options', () => {
      const converter = new JsonToYamlConverter({
        sortKeys: true
      });
      const data = { z: 3, a: 1, m: 2 };
      const yamlString = converter.convertData(data);

      // Keys should be sorted alphabetically
      const lines = yamlString.trim().split('\n');
      expect(lines[0]).toContain('a:');
      expect(lines[1]).toContain('m:');
      expect(lines[2]).toContain('z:');
    });
  });
});

// ============================================================================
// CLI Handler Tests
// ============================================================================

describe('handleCli', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should return 0 for successful conversion', () => {
    const inputFile = path.join(TEST_DIR, 'input.json');
    const outputFile = path.join(TEST_DIR, 'output.yaml');
    const testData = { success: true };

    fs.writeFileSync(inputFile, JSON.stringify(testData));

    const exitCode = handleCli([inputFile, outputFile]);

    expect(exitCode).toBe(0);
    expect(fs.existsSync(outputFile)).toBe(true);
  });

  it('should return 1 for wrong number of arguments', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(handleCli([])).toBe(1);
    expect(handleCli(['only-one-arg'])).toBe(1);
    expect(handleCli(['arg1', 'arg2', 'arg3'])).toBe(1);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Usage: ts-node json-to-yaml-cli.ts <input.json> <output.yaml>'
    );

    consoleSpy.mockRestore();
  });

  it('should return 1 for non-existent input file', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const nonexistent = path.join(TEST_DIR, 'nonexistent.json');
    const output = path.join(TEST_DIR, 'output.yaml');

    const exitCode = handleCli([nonexistent, output]);

    expect(exitCode).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      `Error: Input file not found: ${nonexistent}`
    );

    consoleSpy.mockRestore();
  });

  it('should return 1 for invalid JSON', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const inputFile = path.join(TEST_DIR, 'invalid.json');
    const outputFile = path.join(TEST_DIR, 'output.yaml');

    fs.writeFileSync(inputFile, '{ invalid }');

    const exitCode = handleCli([inputFile, outputFile]);

    expect(exitCode).toBe(1);
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][0]).toContain('Error converting');

    consoleSpy.mockRestore();
  });

  it('should log error message on conversion failure', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const inputFile = path.join(TEST_DIR, 'bad.json');
    const outputFile = path.join(TEST_DIR, 'output.yaml');

    fs.writeFileSync(inputFile, 'not json at all');

    handleCli([inputFile, outputFile]);

    expect(consoleSpy).toHaveBeenCalled();
    const errorCall = consoleSpy.mock.calls[0];
    expect(errorCall[0]).toContain('Error converting');
    expect(errorCall[1]).toBeDefined();

    consoleSpy.mockRestore();
  });
});
