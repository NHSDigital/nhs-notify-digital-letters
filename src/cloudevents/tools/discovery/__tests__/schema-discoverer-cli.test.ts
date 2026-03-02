import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { parseArgs, handleCli } from '../schema-discoverer-cli.ts';
import type { CliArgs } from '../schema-discoverer-types.ts';

const mockSchemaDiscoverer = {
  discover: jest.fn(),
};

jest.mock('../schema-discoverer.ts', () => {
  return {
    SchemaDiscoverer: jest.fn().mockImplementation(() => {
      return mockSchemaDiscoverer;
    }),
  };
});

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
    mockSchemaDiscoverer.discover.mockReturnValue({
      success: false,
      errorMessage: 'File not found',
    });

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

  it('should return 0 and output dependencies on success', () => {
    mockSchemaDiscoverer.discover.mockReturnValue({
      success: true,
      dependencies: new Set(['dep1.yaml', 'dep2.yaml']),
    });

    const args: CliArgs = {
      rootSchemaPath: 'source.yaml',
      baseOutputDir: '/output',
    };

    const exitCode = handleCli(args);

    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalledWith('dep1.yaml');
    expect(consoleLogSpy).toHaveBeenCalledWith('dep2.yaml');
  });
  // Integration test - tests with real file system are in discover-schema-dependencies.test.ts
  // These tests verify the CLI argument parsing and output formatting
});
