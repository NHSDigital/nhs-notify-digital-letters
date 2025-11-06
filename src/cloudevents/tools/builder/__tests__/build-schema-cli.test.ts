/**
 * Unit tests for build-schema-cli.ts
 *
 * Tests the CLI handler and schema building logic.
 */

import fs from 'fs';
import path from 'path';
import { handleCli, buildSchema } from '../build-schema-cli.ts';

describe('build-schema-cli', () => {
  let testDir: string;
  let sourceDir: string;
  let outputDir: string;

  beforeEach(() => {
    // Create test directories
    testDir = path.join(process.cwd(), 'test-build-cli-' + Date.now());
    sourceDir = path.join(testDir, 'src');
    outputDir = path.join(testDir, 'output');

    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directories
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('handleCli', () => {
    it('should return error when no arguments provided', () => {
      const result = handleCli([]);
      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Missing required arguments');
    });

    it('should return error when only source argument provided', () => {
      const result = handleCli(['source.json']);
      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Missing required arguments');
    });

    it('should build a simple JSON schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      };

      const inputFile = path.join(sourceDir, 'test-schema.json');
      fs.writeFileSync(inputFile, JSON.stringify(schema, null, 2));

      const result = handleCli([inputFile, outputDir]);

      expect(result.exitCode).toBe(0);
      expect(result.outputPath).toBeDefined();

      const outputFile = path.join(outputDir, 'test-schema.json');
      expect(fs.existsSync(outputFile)).toBe(true);

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      expect(output).toHaveProperty('$id');
      expect(output).toHaveProperty('type', 'object');
      expect(output).toHaveProperty('properties');
    });

    it('should handle YAML input files', () => {
      const yamlContent = `type: object
properties:
  name:
    type: string
  email:
    type: string
    format: email
`;

      const inputFile = path.join(sourceDir, 'test-schema.yaml');
      fs.writeFileSync(inputFile, yamlContent);

      const result = handleCli([inputFile, outputDir]);

      expect(result.exitCode).toBe(0);

      const outputFile = path.join(outputDir, 'test-schema.json');
      expect(fs.existsSync(outputFile)).toBe(true);

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      expect(output).toHaveProperty('$id');
      expect(output.properties).toHaveProperty('name');
      expect(output.properties).toHaveProperty('email');
    });

    it('should handle --root-dir option', () => {
      const schema = { type: 'object' };
      const inputFile = path.join(sourceDir, 'test-schema.json');
      fs.writeFileSync(inputFile, JSON.stringify(schema, null, 2));

      const result = handleCli(['--root-dir', testDir, inputFile, outputDir]);

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(outputDir, 'test-schema.json'))).toBe(true);
    });

    it('should handle --strip-prefix option with base URL', () => {
      const schema = { type: 'object' };
      const inputFile = path.join(sourceDir, 'test-schema.json');
      fs.writeFileSync(inputFile, JSON.stringify(schema, null, 2));

      const result = handleCli([
        '--root-dir', testDir,
        '--strip-prefix', 'src',
        inputFile,
        outputDir,
        'https://example.com'
      ]);

      expect(result.exitCode).toBe(0);

      const outputFile = path.join(outputDir, 'test-schema.json');
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      expect(output.$id).toContain('https://example.com');
      expect(output.$id).not.toContain('/src/');
    });

    it('should return error for non-existent input file', () => {
      const result = handleCli(['/non/existent/file.json', outputDir]);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
    });

    it('should return error for invalid JSON input', () => {
      const inputFile = path.join(sourceDir, 'invalid.json');
      fs.writeFileSync(inputFile, '{ invalid json }');

      const result = handleCli([inputFile, outputDir]);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
    });
  });

  describe('buildSchema', () => {
    it('should transform $ref paths correctly', () => {
      // Create a referenced schema
      const referencedSchema = { type: 'string' };
      const referencedFile = path.join(sourceDir, 'referenced.json');
      fs.writeFileSync(referencedFile, JSON.stringify(referencedSchema, null, 2));

      // Create a schema with a $ref
      const schema = {
        type: 'object',
        properties: {
          name: { $ref: './referenced.json' }
        }
      };
      const inputFile = path.join(sourceDir, 'main-schema.json');
      fs.writeFileSync(inputFile, JSON.stringify(schema, null, 2));

      const result = buildSchema(inputFile, outputDir, undefined, undefined, testDir);

      expect(result.success).toBe(true);

      const outputFile = path.join(outputDir, 'main-schema.json');
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      expect(output.properties.name.$ref).toBeDefined();
      expect(output.properties.name.$ref).toContain('referenced.json');
    });

    it('should preserve fragment-only $refs', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { $ref: '#/definitions/Name' }
        },
        definitions: {
          Name: { type: 'string' }
        }
      };
      const inputFile = path.join(sourceDir, 'schema.json');
      fs.writeFileSync(inputFile, JSON.stringify(schema, null, 2));

      const result = buildSchema(inputFile, outputDir);

      expect(result.success).toBe(true);

      const outputFile = path.join(outputDir, 'schema.json');
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      expect(output.properties.name.$ref).toBe('#/definitions/Name');
    });

    it('should convert YAML extensions to JSON in $refs', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { $ref: './other.yaml' }
        }
      };
      const inputFile = path.join(sourceDir, 'schema.json');
      fs.writeFileSync(inputFile, JSON.stringify(schema, null, 2));

      const result = buildSchema(inputFile, outputDir, undefined, undefined, testDir);

      expect(result.success).toBe(true);

      const outputFile = path.join(outputDir, 'schema.json');
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      expect(output.properties.name.$ref).toContain('.json');
      expect(output.properties.name.$ref).not.toContain('.yaml');
    });

    it('should use base URL when provided', () => {
      const schema = { type: 'object' };
      const inputFile = path.join(sourceDir, 'schema.json');
      fs.writeFileSync(inputFile, JSON.stringify(schema, null, 2));

      const result = buildSchema(
        inputFile,
        outputDir,
        'https://example.com',
        undefined,
        testDir
      );

      expect(result.success).toBe(true);

      const outputFile = path.join(outputDir, 'schema.json');
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      expect(output.$id).toContain('https://example.com');
      expect(output.$id).toContain('schema.json');
    });

    it('should handle .yml extension', () => {
      const yamlContent = 'type: object\nproperties:\n  name:\n    type: string\n';
      const inputFile = path.join(sourceDir, 'schema.yml');
      fs.writeFileSync(inputFile, yamlContent);

      const result = buildSchema(inputFile, outputDir);

      expect(result.success).toBe(true);

      const outputFile = path.join(outputDir, 'schema.json');
      expect(fs.existsSync(outputFile)).toBe(true);
    });

    it('should create output directory if it does not exist', () => {
      const nestedOutputDir = path.join(outputDir, 'nested', 'path');
      const schema = { type: 'object' };
      const inputFile = path.join(sourceDir, 'schema.json');
      fs.writeFileSync(inputFile, JSON.stringify(schema, null, 2));

      const result = buildSchema(inputFile, nestedOutputDir);

      expect(result.success).toBe(true);
      expect(fs.existsSync(nestedOutputDir)).toBe(true);
    });

    it('should preserve HTTP URLs in $refs', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { $ref: 'https://example.com/schemas/name.json' }
        }
      };
      const inputFile = path.join(sourceDir, 'schema.json');
      fs.writeFileSync(inputFile, JSON.stringify(schema, null, 2));

      const result = buildSchema(inputFile, outputDir);

      expect(result.success).toBe(true);

      const outputFile = path.join(outputDir, 'schema.json');
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      expect(output.properties.name.$ref).toBe('https://example.com/schemas/name.json');
    });

    it('should handle const values with schema references', () => {
      const schema = {
        type: 'object',
        properties: {
          schemaRef: { const: './other-schema.yaml' }
        }
      };
      const inputFile = path.join(sourceDir, 'schema.json');
      fs.writeFileSync(inputFile, JSON.stringify(schema, null, 2));

      const result = buildSchema(inputFile, outputDir, undefined, undefined, testDir);

      expect(result.success).toBe(true);

      const outputFile = path.join(outputDir, 'schema.json');
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      expect(output.properties.schemaRef.const).toContain('.json');
      expect(output.properties.schemaRef.const).not.toContain('.yaml');
    });

    it('should handle examples array with schema references', () => {
      const schema = {
        type: 'string',
        examples: ['./example-schema.yaml']
      };
      const inputFile = path.join(sourceDir, 'schema.json');
      fs.writeFileSync(inputFile, JSON.stringify(schema, null, 2));

      const result = buildSchema(inputFile, outputDir, 'https://example.com', undefined, testDir);

      expect(result.success).toBe(true);

      const outputFile = path.join(outputDir, 'schema.json');
      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

      expect(output.examples[0]).toContain('https://example.com');
      expect(output.examples[0]).toContain('.json');
      expect(output.examples[0]).not.toContain('.yaml');
    });
  });
});
