/**
 * CLI tests for validate.ts
 * Tests the command-line interface by spawning processes with tsx
 * For faster validation tests using direct imports, see validator-integration.test.ts
 */

import { beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const SCRIPT_PATH = path.join(__dirname, '..', 'validate.ts');
const TEST_DIR = path.join(__dirname, 'temp-validate-cli-test');

/**
 * Helper to run validator CLI and handle exit codes
 * Uses tsx for faster execution than ts-node
 */
function runValidator(schemaPath: string, dataPath: string, baseDir?: string): { success: boolean; output: string; error: string } {
  try {
    const args = baseDir ? ['--base', baseDir, schemaPath, dataPath] : [schemaPath, dataPath];
    const result = spawnSync('npx', ['tsx', SCRIPT_PATH, ...args], {
      encoding: 'utf-8',
      timeout: 15000 // tsx is much faster than ts-node
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
});
