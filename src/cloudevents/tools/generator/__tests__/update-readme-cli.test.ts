/**
 * Unit tests for update-readme CLI handler
 *
 * Tests the orchestration of generate-index and render workflows.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { handleCli } from '../readme-generator/update-readme-cli.ts';
import * as generateIndexCli from '../readme-generator/generate-readme-index-cli.ts';
import * as renderReadmeCli from '../readme-generator/render-readme-cli.ts';

// Mock the CLI handlers
jest.mock('../readme-generator/generate-readme-index-cli.ts');
jest.mock('../readme-generator/render-readme-cli.ts');

describe('update-readme CLI handler', () => {
  let testDir: string;
  let mockGenerateIndexCli: jest.MockedFunction<typeof generateIndexCli.handleCli>;
  let mockRenderReadmeCli: jest.MockedFunction<typeof renderReadmeCli.handleCli>;
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let consoleLogSpy: jest.Mock;
  let consoleErrorSpy: jest.Mock;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'update-cli-test-'));

    // Mock console methods
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    consoleLogSpy = jest.fn();
    consoleErrorSpy = jest.fn();
    console.log = consoleLogSpy;
    console.error = consoleErrorSpy;

    // Get mocked functions
    mockGenerateIndexCli = generateIndexCli.handleCli as jest.MockedFunction<typeof generateIndexCli.handleCli>;
    mockRenderReadmeCli = renderReadmeCli.handleCli as jest.MockedFunction<typeof renderReadmeCli.handleCli>;

    // Default successful behavior
    mockGenerateIndexCli.mockReturnValue({ exitCode: 0 });
    mockRenderReadmeCli.mockReturnValue({ exitCode: 0 });
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('successful execution', () => {
    it('should execute both steps successfully', async () => {
      const result = await handleCli([], testDir);

      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
      expect(mockGenerateIndexCli).toHaveBeenCalled();
      expect(mockRenderReadmeCli).toHaveBeenCalled();
    });

    it('should call generate-index before render', async () => {
      const callOrder: string[] = [];

      mockGenerateIndexCli.mockImplementation(() => {
        callOrder.push('generate');
        return { exitCode: 0 };
      });

      mockRenderReadmeCli.mockImplementation(() => {
        callOrder.push('render');
        return { exitCode: 0 };
      });

      await handleCli([], testDir);

      expect(callOrder).toEqual(['generate', 'render']);
    });

    it('should pass arguments to generate-index CLI', async () => {
      const args = ['custom/docs/path'];
      await handleCli(args, testDir);

      expect(mockGenerateIndexCli).toHaveBeenCalledWith(args, testDir);
    });

    it('should pass rootDir to render CLI', async () => {
      await handleCli([], testDir);

      expect(mockRenderReadmeCli).toHaveBeenCalledWith(testDir);
    });

    it('should display initial message', async () => {
      await handleCli([], testDir);

      expect(consoleLogSpy).toHaveBeenCalledWith('📝 Updating README tables...\n');
    });

    it('should display success message', async () => {
      await handleCli([], testDir);

      expect(consoleLogSpy).toHaveBeenCalledWith('\n✅ README tables updated successfully!');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '💡 Edit readme-metadata.yaml to customize labels and purposes'
      );
    });

    it('should log separator between steps', async () => {
      await handleCli([], testDir);

      const logCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      expect(logCalls).toContain('');
    });
  });

  describe('error handling - generate-index failures', () => {
    it('should stop if generate-index fails', async () => {
      mockGenerateIndexCli.mockReturnValue({
        exitCode: 1,
        error: 'Index generation failed',
      });

      const result = await handleCli([], testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Index generation failed');
      expect(mockGenerateIndexCli).toHaveBeenCalled();
      expect(mockRenderReadmeCli).not.toHaveBeenCalled();
    });

    it('should not show success message if generate-index fails', async () => {
      mockGenerateIndexCli.mockReturnValue({
        exitCode: 1,
        error: 'Failed',
      });

      await handleCli([], testDir);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('✅')
      );
    });

    it('should propagate generate-index error code', async () => {
      mockGenerateIndexCli.mockReturnValue({
        exitCode: 2,
        error: 'Custom error',
      });

      const result = await handleCli([], testDir);

      expect(result.exitCode).toBe(2);
      expect(result.error).toBe('Custom error');
    });
  });

  describe('error handling - render failures', () => {
    it('should return error if render fails', async () => {
      mockRenderReadmeCli.mockReturnValue({
        exitCode: 1,
        error: 'Render failed',
      });

      const result = await handleCli([], testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Render failed');
      expect(mockGenerateIndexCli).toHaveBeenCalled();
      expect(mockRenderReadmeCli).toHaveBeenCalled();
    });

    it('should not show success message if render fails', async () => {
      mockRenderReadmeCli.mockReturnValue({
        exitCode: 1,
        error: 'Failed',
      });

      await handleCli([], testDir);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('✅')
      );
    });

    it('should propagate render error code', async () => {
      mockRenderReadmeCli.mockReturnValue({
        exitCode: 3,
        error: 'Render error',
      });

      const result = await handleCli([], testDir);

      expect(result.exitCode).toBe(3);
      expect(result.error).toBe('Render error');
    });
  });

  describe('error handling - exceptions', () => {
    it('should handle exceptions from generate-index', async () => {
      mockGenerateIndexCli.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await handleCli([], testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Unexpected error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Unexpected error');
    });

    it('should handle exceptions from render', async () => {
      mockRenderReadmeCli.mockImplementation(() => {
        throw new Error('Render exception');
      });

      const result = await handleCli([], testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('Render exception');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'Render exception');
    });

    it('should handle non-Error exceptions', async () => {
      mockGenerateIndexCli.mockImplementation(() => {
        throw 'String error';
      });

      const result = await handleCli([], testDir);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('String error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error:', 'String error');
    });
  });

  describe('argument passing', () => {
    it('should pass empty args array to generate-index', async () => {
      await handleCli([], testDir);

      expect(mockGenerateIndexCli).toHaveBeenCalledWith([], testDir);
    });

    it('should pass multiple arguments to generate-index', async () => {
      const args = ['arg1', 'arg2', 'arg3'];
      await handleCli(args, testDir);

      expect(mockGenerateIndexCli).toHaveBeenCalledWith(args, testDir);
    });

    it('should use correct rootDir for both CLI handlers', async () => {
      const customRoot = '/custom/root';
      await handleCli([], customRoot);

      expect(mockGenerateIndexCli).toHaveBeenCalledWith([], customRoot);
      expect(mockRenderReadmeCli).toHaveBeenCalledWith(customRoot);
    });
  });
});
