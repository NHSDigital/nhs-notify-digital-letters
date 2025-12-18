import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { parseArgs, handleCli } from '../schema-discoverer-cli.ts';
import type { CliArgs } from '../schema-discoverer-types.ts';

// Mock console methods
let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

beforeEach(() => {
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

describe('parseArgs', () => {
  it('should parse minimum required arguments', () => {
    const args = ['source.yaml', '/output'];
    const result = parseArgs(args);

    expect(result).toEqual({
      rootSchemaPath: 'source.yaml',
      baseOutputDir: '/output',
    });
  });

  it('should handle absolute paths', () => {
    const args = ['/absolute/path/source.yaml', '/output'];
    const result = parseArgs(args);

    expect(result).not.toBeNull();
    expect(result?.rootSchemaPath).toBe('/absolute/path/source.yaml');
    expect(result?.baseOutputDir).toBe('/output');
  });

  it('should handle paths with spaces (single argument)', () => {
    const args = ['/path with spaces/source.yaml', '/output'];
    const result = parseArgs(args);

    expect(result).not.toBeNull();
    expect(result?.rootSchemaPath).toBe('/path with spaces/source.yaml');
  });

  it('should return null if missing rootSchemaPath', () => {
    const args: string[] = [];
    const result = parseArgs(args);

    expect(result).toBeNull();
  });

  it('should return null if missing baseOutputDir', () => {
    const args = ['source.yaml'];
    const result = parseArgs(args);

    expect(result).toBeNull();
  });

  it('should return null if empty arguments', () => {
    const args: string[] = [];
    const result = parseArgs(args);

    expect(result).toBeNull();
  });
});

describe('handleCli', () => {
  it('should return 1 on discovery failure for nonexistent file', () => {
    const args: CliArgs = {
      rootSchemaPath: '/nonexistent/schema.yaml',
      baseOutputDir: '/output',
    };

    const exitCode = handleCli(args);

    expect(exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error:')
    );
  });

  // Integration test - tests with real file system are in discover-schema-dependencies.test.ts
  // These tests verify the CLI argument parsing and output formatting
});
