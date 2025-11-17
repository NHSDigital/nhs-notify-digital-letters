/**
 * Unit tests for generate-readme-index CLI handler
 *
 * Tests the CLI argument parsing, error handling, and class instantiation.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { handleCli } from '../readme-generator/generate-readme-index-cli.ts';
import { ReadmeIndexGenerator } from '../readme-generator/readme-index-generator.ts';

// Mock the ReadmeIndexGenerator class
jest.mock('../readme-generator/readme-index-generator.ts');

describe('generate-readme-index CLI handler', () => {
  let testDir: string;
  let mockGenerateToFile: jest.Mock;
  let originalConsoleError: typeof console.error;
  let consoleErrorSpy: jest.Mock;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));

    // Mock console.error
    originalConsoleError = console.error;
    consoleErrorSpy = jest.fn();
    console.error = consoleErrorSpy;

    // Mock the generateToFile method
    mockGenerateToFile = jest.fn();
    (ReadmeIndexGenerator as jest.MockedClass<typeof ReadmeIndexGenerator>).mockImplementation(() => ({
      generateToFile: mockGenerateToFile,
      getIndexFile: jest.fn(),
      getDocsDir: jest.fn(),
    } as any));
  });

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError;

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('successful execution', () => {
    it('should execute successfully with no arguments', () => {
      const result = handleCli([], testDir);

      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
      expect(ReadmeIndexGenerator).toHaveBeenCalledWith({
        rootDir: testDir,
        verbose: true,
      });
      expect(mockGenerateToFile).toHaveBeenCalled();
    });

    it('should execute successfully with custom docs path', () => {
      const customDocsPath = 'custom/docs';
      const result = handleCli([customDocsPath], testDir);

      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
      expect(ReadmeIndexGenerator).toHaveBeenCalledWith({
        rootDir: testDir,
        verbose: true,
        docsDir: path.resolve(testDir, customDocsPath),
      });
      expect(mockGenerateToFile).toHaveBeenCalled();
    });

    it('should resolve relative docs path correctly', () => {
      const result = handleCli(['../other-docs'], testDir);

      expect(result.exitCode).toBe(0);
      expect(ReadmeIndexGenerator).toHaveBeenCalledWith(
        expect.objectContaining({
          docsDir: path.resolve(testDir, '../other-docs'),
        })
      );
    });

    it('should call generateToFile exactly once', () => {
      handleCli([], testDir);

      expect(mockGenerateToFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle generator errors', () => {
      const errorMessage = 'Failed to generate index';
      mockGenerateToFile.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = handleCli([], testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe(errorMessage);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', errorMessage);
    });

    it('should handle non-Error exceptions', () => {
      mockGenerateToFile.mockImplementation(() => {
        throw 'String error';
      });

      const result = handleCli([], testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('String error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'String error');
    });

    it('should handle constructor errors', () => {
      (ReadmeIndexGenerator as jest.MockedClass<typeof ReadmeIndexGenerator>).mockImplementation(() => {
        throw new Error('Constructor failed');
      });

      const result = handleCli([], testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Constructor failed');
    });

    it('should handle file system errors', () => {
      mockGenerateToFile.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result = handleCli([], testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('ENOENT');
    });
  });

  describe('argument processing', () => {
    it('should ignore additional arguments beyond first', () => {
      const result = handleCli(['docs', 'extra', 'args'], testDir);

      expect(result.exitCode).toBe(0);
      expect(ReadmeIndexGenerator).toHaveBeenCalledWith({
        rootDir: testDir,
        verbose: true,
        docsDir: path.resolve(testDir, 'docs'),
      });
    });

    it('should handle empty string as docs path', () => {
      const result = handleCli([''], testDir);

      expect(result.exitCode).toBe(0);
      // Empty string is falsy in JavaScript conditional, so docsDir won't be set
      expect(ReadmeIndexGenerator).toHaveBeenCalledWith({
        rootDir: testDir,
        verbose: true,
        // No docsDir property when empty string is passed
      });
    });

    it('should handle absolute paths for docs', () => {
      const absolutePath = '/absolute/path/to/docs';
      const result = handleCli([absolutePath], testDir);

      expect(result.exitCode).toBe(0);
      expect(ReadmeIndexGenerator).toHaveBeenCalledWith(
        expect.objectContaining({
          docsDir: path.resolve(testDir, absolutePath),
        })
      );
    });
  });

  describe('configuration', () => {
    it('should always enable verbose mode', () => {
      handleCli([], testDir);

      expect(ReadmeIndexGenerator).toHaveBeenCalledWith(
        expect.objectContaining({
          verbose: true,
        })
      );
    });

    it('should pass rootDir correctly', () => {
      const customRoot = '/custom/root';
      handleCli([], customRoot);

      expect(ReadmeIndexGenerator).toHaveBeenCalledWith(
        expect.objectContaining({
          rootDir: customRoot,
        })
      );
    });

    it('should not pass docsDir when no arguments provided', () => {
      handleCli([], testDir);

      const callArgs = (ReadmeIndexGenerator as jest.MockedClass<typeof ReadmeIndexGenerator>).mock.calls[0][0];
      expect(callArgs).toEqual({
        rootDir: testDir,
        verbose: true,
      });
      expect(callArgs).not.toHaveProperty('docsDir');
    });
  });
});
