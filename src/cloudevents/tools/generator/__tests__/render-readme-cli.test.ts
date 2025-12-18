/**
 * Unit tests for render-readme CLI handler
 *
 * Tests the CLI execution, error handling, and class instantiation.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { handleCli } from '../readme-generator/render-readme-cli.ts';
import { ReadmeRenderer } from '../readme-generator/readme-renderer.ts';

// Mock the ReadmeRenderer class
jest.mock('../readme-generator/readme-renderer.ts');

describe('render-readme CLI handler', () => {
  let testDir: string;
  let mockRender: jest.Mock;
  let originalConsoleError: typeof console.error;
  let consoleErrorSpy: jest.Mock;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'render-cli-test-'));

    // Mock console.error
    originalConsoleError = console.error;
    consoleErrorSpy = jest.fn();
    console.error = consoleErrorSpy;

    // Mock the render method
    mockRender = jest.fn();
    (ReadmeRenderer as jest.MockedClass<typeof ReadmeRenderer>).mockImplementation(() => ({
      render: mockRender,
      loadIndex: jest.fn(),
      generateContent: jest.fn(),
      updateReadme: jest.fn(),
      getIndexFile: jest.fn(),
      getReadmeFile: jest.fn(),
      getMarkers: jest.fn(),
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
    it('should execute successfully', () => {
      const result = handleCli(testDir);

      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
      expect(ReadmeRenderer).toHaveBeenCalledWith({
        rootDir: testDir,
        verbose: true,
      });
      expect(mockRender).toHaveBeenCalled();
    });

    it('should call render exactly once', () => {
      handleCli(testDir);

      expect(mockRender).toHaveBeenCalledTimes(1);
    });

    it('should pass rootDir correctly', () => {
      const customRoot = '/custom/root/path';
      handleCli(customRoot);

      expect(ReadmeRenderer).toHaveBeenCalledWith({
        rootDir: customRoot,
        verbose: true,
      });
    });

    it('should always enable verbose mode', () => {
      handleCli(testDir);

      expect(ReadmeRenderer).toHaveBeenCalledWith(
        expect.objectContaining({
          verbose: true,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle renderer errors', () => {
      const errorMessage = 'Failed to render README';
      mockRender.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = handleCli(testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe(errorMessage);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', errorMessage);
    });

    it('should provide hint when index file not found', () => {
      const errorMessage = 'Index file not found: /path/to/index.yaml';
      mockRender.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = handleCli(testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe(errorMessage);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', errorMessage);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '💡 Run generate-readme-index.cjs first'
      );
    });

    it('should not show hint for other errors', () => {
      mockRender.mockImplementation(() => {
        throw new Error('Some other error');
      });

      handleCli(testDir);

      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('💡 Run')
      );
    });

    it('should handle non-Error exceptions', () => {
      mockRender.mockImplementation(() => {
        throw 'String error';
      });

      const result = handleCli(testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('String error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'String error');
    });

    it('should handle constructor errors', () => {
      (ReadmeRenderer as jest.MockedClass<typeof ReadmeRenderer>).mockImplementation(() => {
        throw new Error('Constructor failed');
      });

      const result = handleCli(testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Constructor failed');
    });

    it('should handle README marker errors', () => {
      mockRender.mockImplementation(() => {
        throw new Error('README.md must contain both markers');
      });

      const result = handleCli(testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('must contain both markers');
    });

    it('should handle YAML parsing errors', () => {
      mockRender.mockImplementation(() => {
        throw new Error('Invalid YAML in index file');
      });

      const result = handleCli(testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Invalid YAML');
    });
  });

  describe('configuration', () => {
    it('should use default paths when no custom options', () => {
      handleCli(testDir);

      const callArgs = (ReadmeRenderer as jest.MockedClass<typeof ReadmeRenderer>).mock.calls[0][0];
      expect(callArgs).toEqual({
        rootDir: testDir,
        verbose: true,
      });
      // Should not have indexFile or readmeFile properties
      expect(callArgs).not.toHaveProperty('indexFile');
      expect(callArgs).not.toHaveProperty('readmeFile');
    });

    it('should instantiate ReadmeRenderer before calling render', () => {
      const callOrder: string[] = [];

      (ReadmeRenderer as jest.MockedClass<typeof ReadmeRenderer>).mockImplementation(() => {
        callOrder.push('constructor');
        return {
          render: jest.fn(() => callOrder.push('render')),
        } as any;
      });

      handleCli(testDir);

      expect(callOrder).toEqual(['constructor', 'render']);
    });
  });
});
