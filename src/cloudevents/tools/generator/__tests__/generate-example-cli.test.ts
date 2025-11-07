/**
 * Tests for generate-example-cli.ts
 * Tests the CLI handler logic separately from the entry point
 */

import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { handleCli } from '../example-generator/generate-example-cli.ts';

const TEST_DIR = path.join(__dirname, 'temp-cli-test');

// Mock console.error to suppress error output during tests
const originalConsoleError = console.error;
let consoleErrorMock: jest.Mock;

describe('generate-example-cli', () => {
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    // Mock console.error
    consoleErrorMock = jest.fn() as jest.Mock;
    console.error = consoleErrorMock;
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }

    // Restore console.error
    console.error = originalConsoleError;
  });

  describe('handleCli() - argument validation', () => {
    it('should return error when no arguments provided', async () => {
      const result = await handleCli([]);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Missing required arguments');
      expect(consoleErrorMock).toHaveBeenCalled();
    });

    it('should return error when only schema argument provided', async () => {
      const result = await handleCli(['schema.json']);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Missing required arguments');
      expect(consoleErrorMock).toHaveBeenCalled();
    });

    it('should display usage message on missing arguments', async () => {
      await handleCli([]);

      const errorOutput = consoleErrorMock.mock.calls[0][0];
      expect(errorOutput).toContain('Usage: ts-node generate-example.ts');
      expect(errorOutput).toContain('--clear-cache');
      expect(errorOutput).toContain('--cache-info');
      expect(errorOutput).toContain('SCHEMA_CACHE_DIR');
    });
  });

  describe('handleCli() - cache management', () => {
    it('should handle --clear-cache command', async () => {
      const result = await handleCli(['--clear-cache']);

      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle --cache-info command', async () => {
      const result = await handleCli(['--cache-info']);

      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
    });
  });

  describe('handleCli() - example generation', () => {
    it('should generate example from valid schema', async () => {
      const schemaFile = path.join(TEST_DIR, 'simple-schema.json');
      const outputFile = path.join(TEST_DIR, 'output.json');
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));

      const result = await handleCli([schemaFile, outputFile]);

      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
      expect(fs.existsSync(outputFile)).toBe(true);

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      expect(output).toHaveProperty('name');
    });

    it('should return error for invalid schema', async () => {
      const schemaFile = path.join(TEST_DIR, 'invalid-schema.json');
      const outputFile = path.join(TEST_DIR, 'output.json');

      // Write actually invalid JSON (unclosed brace)
      fs.writeFileSync(schemaFile, '{ "type": "object"');

      const result = await handleCli([schemaFile, outputFile]);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Generation failed');
      expect(fs.existsSync(outputFile)).toBe(false);
    });

    it('should return error for non-existent schema', async () => {
      const schemaFile = path.join(TEST_DIR, 'nonexistent.json');
      const outputFile = path.join(TEST_DIR, 'output.json');

      const result = await handleCli([schemaFile, outputFile]);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Generation failed');
      expect(fs.existsSync(outputFile)).toBe(false);
    });

    it('should create output directory if needed', async () => {
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

      const result = await handleCli([schemaFile, outputFile]);

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.existsSync(outputFile)).toBe(true);
    });
  });

  describe('handleCli() - CloudEvents examples', () => {
    it('should generate CloudEvents compliant example', async () => {
      const schemaFile = path.join(TEST_DIR, 'cloudevents-schema.json');
      const outputFile = path.join(TEST_DIR, 'cloudevents-output.json');
      const schema = {
        type: 'object',
        properties: {
          specversion: { type: 'string', const: '1.0' },
          type: { type: 'string' },
          source: { type: 'string' },
          id: { type: 'string', format: 'uuid' }
        },
        required: ['specversion', 'type', 'source', 'id']
      };

      fs.writeFileSync(schemaFile, JSON.stringify(schema, null, 2));

      const result = await handleCli([schemaFile, outputFile]);

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(outputFile)).toBe(true);

      const output = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      expect(output.specversion).toBe('1.0');
      expect(output).toHaveProperty('type');
      expect(output).toHaveProperty('source');
      expect(output).toHaveProperty('id');
    });
  });
});
