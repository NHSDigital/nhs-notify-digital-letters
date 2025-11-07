/**
 * Unit tests for SchemaDiscoverer class
 *
 * Tests the class-based implementation with dependency injection
 */

import { describe, it, expect, jest } from '@jest/globals';
import { SchemaDiscoverer } from '../schema-discoverer.ts';
import type { FileSystem, PathInterface } from '../schema-discoverer-types.ts';

describe('SchemaDiscoverer', () => {
  describe('constructor', () => {
    it('should create instance with baseOutputDir', () => {
      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
      });

      expect(discoverer.getBaseOutputDir()).toBe('/output');
    });

    it('should accept custom fs implementation', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(() => '{"title": "test"}'),
        existsSync: jest.fn<(path: string) => boolean>(() => true),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
      });

      expect(discoverer.getBaseOutputDir()).toBe('/output');
    });

    it('should use custom domainsSeparator', () => {
      const mockPath = {
        resolve: jest.fn<(...paths: string[]) => string>((...paths) => paths.join('/')),
        dirname: jest.fn(),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        domainsSeparator: '/custom-separator/',
        path: mockPath as unknown as PathInterface,
      });

      const result = discoverer.sourceToOutputPath(
        '/src/custom-separator/test-domain/event.yaml'
      );

      expect(result).toContain('test-domain/event.json');
      expect(result).not.toContain('custom-separator');
    });

    it('should default to /domains/ separator', () => {
      const mockPath = {
        resolve: jest.fn<(...paths: string[]) => string>((...paths) => paths.join('/')),
        dirname: jest.fn(),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        path: mockPath as unknown as PathInterface,
      });

      const result = discoverer.sourceToOutputPath(
        '/src/cloudevents/domains/test-domain/event.yaml'
      );

      expect(result).toContain('test-domain/event.json');
    });
  });

  describe('loadSchema', () => {
    it('should load JSON schema file', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(() => '{"title": "Test Schema", "type": "object"}'),
        existsSync: jest.fn<(path: string) => boolean>(() => true),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
      });

      const schema = discoverer.loadSchema('/path/to/schema.json');

      expect(schema).toEqual({ title: 'Test Schema', type: 'object' });
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/schema.json', 'utf-8');
    });

    it('should load YAML schema file', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(() => 'title: Test Schema\ntype: object'),
        existsSync: jest.fn<(path: string) => boolean>(() => true),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
      });

      const schema = discoverer.loadSchema('/path/to/schema.yaml');

      expect(schema).toEqual({ title: 'Test Schema', type: 'object' });
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/schema.yaml', 'utf-8');
    });

    it('should load YML schema file', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(() => 'title: Test Schema\ntype: object'),
        existsSync: jest.fn<(path: string) => boolean>(() => true),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
      });

      const schema = discoverer.loadSchema('/path/to/schema.yml');

      expect(schema).toEqual({ title: 'Test Schema', type: 'object' });
    });

    it('should return null on JSON parse error', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(() => '{invalid json}'),
        existsSync: jest.fn<(path: string) => boolean>(() => true),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
      });

      const schema = discoverer.loadSchema('/path/to/invalid.json');

      expect(schema).toBeNull();
    });

    it('should return null on YAML parse error', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(() => 'invalid: yaml: content: ['),
        existsSync: jest.fn<(path: string) => boolean>(() => true),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
      });

      const schema = discoverer.loadSchema('/path/to/invalid.yaml');

      expect(schema).toBeNull();
    });

    it('should return null on file read error', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(() => {
          throw new Error('File not found');
        }),
        existsSync: jest.fn<(path: string) => boolean>(() => true),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
      });

      const schema = discoverer.loadSchema('/path/to/missing.json');

      expect(schema).toBeNull();
    });
  });

  describe('resolveReference', () => {
    it('should resolve relative reference', () => {
      const mockFs = {
        readFileSync: jest.fn(),
        existsSync: jest.fn<(path: string) => boolean>(() => true),
      } as unknown as FileSystem;

      const mockPath = {
        resolve: jest.fn<(...paths: string[]) => string>((...paths: string[]) => paths.join('/')),
        dirname: jest.fn((p: string) => p.split('/').slice(0, -1).join('/')),
      } as unknown as PathInterface;

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
        path: mockPath as unknown as PathInterface,
      });

      const result = discoverer.resolveReference(
        '/src/domain/event.yaml',
        '../common/profile.yaml'
      );

      expect(result).toBe('/src/domain/../common/profile.yaml');
      expect(mockFs.existsSync).toHaveBeenCalledWith('/src/domain/../common/profile.yaml');
    });

    it('should return null for HTTP references', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(),
        existsSync: jest.fn<(path: string) => boolean>(),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
      });

      const result = discoverer.resolveReference(
        '/src/domain/event.yaml',
        'http://example.com/schema.json'
      );

      expect(result).toBeNull();
      expect(mockFs.existsSync).not.toHaveBeenCalled();
    });

    it('should return null for HTTPS references', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(),
        existsSync: jest.fn<(path: string) => boolean>(),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
      });

      const result = discoverer.resolveReference(
        '/src/domain/event.yaml',
        'https://example.com/schema.json'
      );

      expect(result).toBeNull();
    });

    it('should return null for absolute path references', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(),
        existsSync: jest.fn<(path: string) => boolean>(),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
      });

      const result = discoverer.resolveReference(
        '/src/domain/event.yaml',
        '/absolute/path/schema.json'
      );

      expect(result).toBeNull();
    });

    it('should return null if referenced file does not exist', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(),
        existsSync: jest.fn<(path: string) => boolean>(() => false),
      };

      const mockPath = {
        resolve: jest.fn<(...paths: string[]) => string>((...paths) => paths.join('/')),
        dirname: jest.fn<(p: string) => string>((p: string) => p.split('/').slice(0, -1).join('/')),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
        path: mockPath as unknown as PathInterface,
      });

      const result = discoverer.resolveReference(
        '/src/domain/event.yaml',
        '../common/missing.yaml'
      );

      expect(result).toBeNull();
      expect(mockFs.existsSync).toHaveBeenCalledWith('/src/domain/../common/missing.yaml');
    });
  });

  describe('sourceToOutputPath', () => {
    it('should convert source path to output path', () => {
      const mockPath = {
        resolve: jest.fn<(...paths: string[]) => string>((...paths) => paths.join('/')),
        dirname: jest.fn(),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        path: mockPath as unknown as PathInterface,
      });

      const result = discoverer.sourceToOutputPath(
        '/src/cloudevents/domains/test-domain/2025-01/event.schema.yaml'
      );

      expect(result).toContain('test-domain/2025-01/event.schema.json');
      expect(result).toContain('/output');
    });

    it('should convert .yml extension to .json', () => {
      const mockPath = {
        resolve: jest.fn<(...paths: string[]) => string>((...paths) => paths.join('/')),
        dirname: jest.fn(),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        path: mockPath as unknown as PathInterface,
      });

      const result = discoverer.sourceToOutputPath(
        '/src/cloudevents/domains/test-domain/2025-01/event.schema.yml'
      );

      expect(result).toContain('event.schema.json');
      expect(result).not.toContain('.yml');
    });

    it('should return null if /domains/ not found in path', () => {
      const mockPath = {
        resolve: jest.fn<(...paths: string[]) => string>((p) => p),
        dirname: jest.fn(),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        path: mockPath as unknown as PathInterface,
      });

      const result = discoverer.sourceToOutputPath('/some/other/path/event.yaml');

      expect(result).toBeNull();
    });
  });

  describe('discover', () => {
    it('should return error if root schema does not exist', () => {
      const mockFs = {
        readFileSync: jest.fn(),
        existsSync: jest.fn<(path: string) => boolean>(() => false),
      };

      const mockPath = {
        resolve: jest.fn<(...paths: string[]) => string>((p) => p),
        dirname: jest.fn(),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
        path: mockPath as unknown as PathInterface,
      });

      const result = discoverer.discover('/path/to/missing.yaml');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Root schema file not found');
      expect(result.dependencies.size).toBe(0);
    });

    it('should discover single schema with no dependencies', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(() => JSON.stringify({ title: 'Simple Schema' })),
        existsSync: jest.fn<(path: string) => boolean>(() => true),
      };

      const mockPath = {
        resolve: jest.fn<(...paths: string[]) => string>((...paths) => paths.join('/')),
        dirname: jest.fn<(p: string) => string>((p: string) => p.split('/').slice(0, -1).join('/')),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
        path: mockPath as unknown as PathInterface,
      });

      const result = discoverer.discover(
        '/src/cloudevents/domains/test/2025-01/simple.schema.json'
      );

      expect(result.success).toBe(true);
      expect(result.dependencies.size).toBe(1);
      const deps = Array.from(result.dependencies);
      expect(deps[0]).toContain('test/2025-01/simple.schema.json');
    });

    // Skip: Complex reference resolution requires more sophisticated mocking or integration tests
    // Reference resolution with relative paths is fully tested via integration tests in discover-schema-dependencies.test.ts
    it.skip('should discover dependencies from allOf references', () => {});

    it.skip('should handle circular references without infinite loop', () => {
      // This test is skipped because mocking complex path resolution is difficult
      // Circular reference handling is tested via integration tests in discover-schema-dependencies.test.ts
    });

    it.skip('should discover dependencies from root-level $ref', () => {
      // This test is skipped because mocking complex path resolution is difficult
      // Root $ref handling is tested via integration tests in discover-schema-dependencies.test.ts
    });

    it.skip('should discover dependencies from nested property allOf', () => {
      // This test is skipped because mocking complex path resolution is difficult
      // Nested property allOf handling is tested via integration tests in discover-schema-dependencies.test.ts
    });

    it('should skip external HTTP references', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(() =>
          JSON.stringify({
            title: 'Event',
            allOf: [{ $ref: 'https://example.com/schema.json' }],
          })
        ),
        existsSync: jest.fn<(path: string) => boolean>(() => true),
      };

      const mockPath = {
        resolve: jest.fn<(...paths: string[]) => string>((...paths) => paths.join('/')),
        dirname: jest.fn<(p: string) => string>((p: string) => p.split('/').slice(0, -1).join('/')),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
        path: mockPath as unknown as PathInterface,
      });

      const result = discoverer.discover(
        '/src/cloudevents/domains/test/2025-01/event.yaml'
      );

      expect(result.success).toBe(true);
      expect(result.dependencies.size).toBe(1); // Only the root schema
    });

    it('should return error if no dependencies discovered', () => {
      const mockFs = {
        readFileSync: jest.fn<(path: string, encoding: string) => string>(() => JSON.stringify({ title: 'Event' })),
        existsSync: jest.fn<(path: string) => boolean>(() => true),
      };

      const mockPath = {
        resolve: jest.fn<(...paths: string[]) => string>(() => '/invalid/path/without/domains'),
        dirname: jest.fn<(p: string) => string>((p: string) => p.split('/').slice(0, -1).join('/')),
      };

      const discoverer = new SchemaDiscoverer({
        baseOutputDir: '/output',
        fs: mockFs as unknown as FileSystem,
        path: mockPath as unknown as PathInterface,
      });

      const result = discoverer.discover('/invalid/path/event.yaml');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('No dependencies discovered');
    });
  });
});
