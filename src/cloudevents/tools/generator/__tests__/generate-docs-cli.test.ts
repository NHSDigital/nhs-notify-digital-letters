/**
 * Tests for generate-docs-cli.ts
 * Tests the CLI handler logic separately from integration
 */

import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  parseCliArgs,
  validateInputDir,
  ensureOutputDir,
  handleCli,
  printUsage,
} from '../docs-generator/generate-docs-cli.ts';

const TEST_DIR = path.join(__dirname, 'temp-docs-cli-test');

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
let consoleErrorMock: jest.Mock;
let consoleLogMock: jest.Mock;

describe('generate-docs-cli', () => {
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    // Mock console methods
    consoleErrorMock = jest.fn() as jest.Mock;
    consoleLogMock = jest.fn() as jest.Mock;
    console.error = consoleErrorMock;
    console.log = consoleLogMock;
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }

    // Restore console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe('parseCliArgs()', () => {
    it('should return error when no arguments provided', () => {
      const result = parseCliArgs([]);

      expect(result.error).toBe('Missing required arguments');
      expect(result.config.inputDir).toBe('');
      expect(result.config.outputDir).toBe('');
    });

    it('should return error when only one argument provided', () => {
      const result = parseCliArgs(['input-only']);

      expect(result.error).toBe('Missing required arguments');
    });

    it('should parse valid arguments', () => {
      const inputDir = '/path/to/input';
      const outputDir = '/path/to/output';
      const result = parseCliArgs([inputDir, outputDir]);

      expect(result.error).toBeUndefined();
      expect(result.config.inputDir).toContain('input');
      expect(result.config.outputDir).toContain('output');
    });

    it('should resolve relative paths to absolute paths', () => {
      const result = parseCliArgs(['./relative/input', './relative/output']);

      expect(result.config.inputDir).toMatch(/^[/\\]/); // Starts with / or \
      expect(result.config.outputDir).toMatch(/^[/\\]/);
    });

    it('should handle verbose flag', () => {
      const result = parseCliArgs(['input', 'output', '--verbose']);

      expect(result.config.verbose).toBe(true);
    });

    it('should handle -v flag', () => {
      const result = parseCliArgs(['input', 'output', '-v']);

      expect(result.config.verbose).toBe(true);
    });
  });

  describe('validateInputDir()', () => {
    it('should return valid: true for existing directory', () => {
      const result = validateInputDir(TEST_DIR);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid: false for non-existent directory', () => {
      const nonExistent = path.join(TEST_DIR, 'does-not-exist');
      const result = validateInputDir(nonExistent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  describe('ensureOutputDir()', () => {
    it('should create directory if it does not exist', () => {
      const newDir = path.join(TEST_DIR, 'new-output');
      const result = ensureOutputDir(newDir);

      expect(result.success).toBe(true);
      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('should succeed if directory already exists', () => {
      const result = ensureOutputDir(TEST_DIR);

      expect(result.success).toBe(true);
    });

    it('should handle nested directory creation', () => {
      const nestedDir = path.join(TEST_DIR, 'level1', 'level2', 'level3');
      const result = ensureOutputDir(nestedDir);

      expect(result.success).toBe(true);
      expect(fs.existsSync(nestedDir)).toBe(true);
    });
  });

  describe('printUsage()', () => {
    it('should print usage information', () => {
      printUsage();

      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Usage: ts-node generate-docs-cli.ts')
      );
      expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('Example:'));
    });
  });

  describe('handleCli()', () => {
    it('should return error when no arguments provided', async () => {
      const result = await handleCli([]);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Missing required arguments');
      expect(consoleErrorMock).toHaveBeenCalled();
    });

    it('should return error when only one argument provided', async () => {
      const result = await handleCli(['input-only']);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Missing required arguments');
    });

    it('should return error when input directory does not exist', async () => {
      const nonExistent = path.join(TEST_DIR, 'does-not-exist');
      const outputDir = path.join(TEST_DIR, 'output');

      const result = await handleCli([nonExistent, outputDir]);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('does not exist');
    });

    it('should create output directory if it does not exist', async () => {
      const inputDir = TEST_DIR;
      const outputDir = path.join(TEST_DIR, 'new-output');

      const result = await handleCli([inputDir, outputDir]);

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(outputDir)).toBe(true);
    });

    it('should return success for valid directories', async () => {
      const inputDir = TEST_DIR;
      const outputDir = path.join(TEST_DIR, 'output');
      fs.mkdirSync(outputDir, { recursive: true });

      const result = await handleCli([inputDir, outputDir]);

      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
      expect(result.result?.success).toBe(true);
      expect(result.result?.inputDir).toBe(inputDir);
      expect(result.result?.outputDir).toBe(outputDir);
    });

    it('should log input and output directories', async () => {
      const inputDir = TEST_DIR;
      const outputDir = path.join(TEST_DIR, 'output');
      fs.mkdirSync(outputDir, { recursive: true });

      await handleCli([inputDir, outputDir]);

      expect(consoleLogMock).toHaveBeenCalledWith('Input directory:', inputDir);
      expect(consoleLogMock).toHaveBeenCalledWith('Output directory:', outputDir);
    });
  });
});
