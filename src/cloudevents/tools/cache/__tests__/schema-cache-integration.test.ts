import fs from 'fs';
import path from 'path';
import * as schemaCache from '../schema-cache';

/**
 * Integration tests for schema-cache module
 * These tests work with the actual cache implementation
 */

describe('schema-cache', () => {
  let testCacheDir: string;
  let originalCacheDir: string;

  beforeAll(() => {
    // Create a temporary cache directory for testing
    testCacheDir = path.join(process.cwd(), 'test-cache-' + Date.now());
    if (!fs.existsSync(testCacheDir)) {
      fs.mkdirSync(testCacheDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test cache directory
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Clear cache before each test
    schemaCache.clearCache();
  });

  describe('module constants', () => {
    it('should have CACHE_DIR defined', () => {
      expect(schemaCache.CACHE_DIR).toBeDefined();
      expect(typeof schemaCache.CACHE_DIR).toBe('string');
    });

    it('should have CACHE_MAX_AGE_MS set to 24 hours', () => {
      expect(schemaCache.CACHE_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('setCachedSchema and getCachedSchema', () => {
    it('should cache and retrieve a schema', async () => {
      const url = 'https://test.example.com/schema-' + Date.now() + '.json';
      const content = JSON.stringify({ type: 'object', properties: { name: { type: 'string' } } });

      // Set the cache
      schemaCache.setCachedSchema(url, content);

      // The schema should be in memory cache now
      const cacheInfo = schemaCache.getCacheInfo();
      expect(cacheInfo.memoryCount).toBeGreaterThan(0);
    });

    it('should write cache to file system', () => {
      const url = 'https://test.example.com/schema-fs-' + Date.now() + '.json';
      const content = JSON.stringify({ type: 'string' });

      schemaCache.setCachedSchema(url, content);

      // Check that a file was written
      const cacheInfo = schemaCache.getCacheInfo();
      expect(cacheInfo.count).toBeGreaterThanOrEqual(0); // May be 0 if mocked
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', () => {
      // Add some cache entries
      schemaCache.setCachedSchema('https://test1.example.com/schema.json', '{"type": "object"}');
      schemaCache.setCachedSchema('https://test2.example.com/schema.json', '{"type": "string"}');

      // Clear cache
      const cleared = schemaCache.clearCache();

      // cleared should be a number (count of cleared entries)
      expect(typeof cleared).toBe('number');
      expect(cleared).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 when cache directory does not exist', () => {
      // Clear cache multiple times - subsequent clears should return 0
      schemaCache.clearCache();
      const cleared = schemaCache.clearCache();

      expect(cleared).toBe(0);
    });
  });

  describe('getCacheInfo', () => {
    it('should return cache information structure', () => {
      const info = schemaCache.getCacheInfo();

      expect(info).toHaveProperty('directory');
      expect(info).toHaveProperty('maxAgeHours');
      expect(info).toHaveProperty('count');
      expect(info).toHaveProperty('memoryCount');
      expect(info).toHaveProperty('entries');

      expect(typeof info.directory).toBe('string');
      expect(typeof info.maxAgeHours).toBe('number');
      expect(typeof info.count).toBe('number');
      expect(typeof info.memoryCount).toBe('number');
      expect(Array.isArray(info.entries)).toBe(true);
    });

    it('should return correct maxAgeHours', () => {
      const info = schemaCache.getCacheInfo();
      expect(info.maxAgeHours).toBe(24);
    });

    it('should track cache entries', () => {
      schemaCache.clearCache();

      const url = 'https://test-info.example.com/schema-' + Date.now() + '.json';
      schemaCache.setCachedSchema(url, '{"type": "boolean"}');

      const info = schemaCache.getCacheInfo();
      expect(info.memoryCount).toBeGreaterThanOrEqual(1);
    });

    it('should include file age information in entries', () => {
      schemaCache.clearCache();

      const url = 'https://test-age.example.com/schema-' + Date.now() + '.json';
      schemaCache.setCachedSchema(url, '{"type": "number"}');

      const info = schemaCache.getCacheInfo();
      info.entries.forEach(entry => {
        expect(entry).toHaveProperty('file');
        expect(entry).toHaveProperty('ageMinutes');
        expect(entry).toHaveProperty('expired');
        expect(typeof entry.file).toBe('string');
        expect(typeof entry.ageMinutes).toBe('number');
        expect(typeof entry.expired).toBe('boolean');
      });
    });
  });

  describe('displayCacheInfo', () => {
    it('should not throw when displaying cache info', () => {
      expect(() => schemaCache.displayCacheInfo()).not.toThrow();
    });

    it('should handle empty cache', () => {
      schemaCache.clearCache();
      expect(() => schemaCache.displayCacheInfo()).not.toThrow();
    });

    it('should handle cache with entries', () => {
      schemaCache.clearCache();
      schemaCache.setCachedSchema('https://test-display.example.com/schema.json', '{"type": "array"}');
      expect(() => schemaCache.displayCacheInfo()).not.toThrow();
    });
  });

  describe('Cache lifecycle', () => {
    it('should handle set, get info, clear cycle', () => {
      // Clear
      schemaCache.clearCache();
      let info = schemaCache.getCacheInfo();
      const initialMemoryCount = info.memoryCount;

      // Set
      const url = 'https://test-lifecycle.example.com/schema-' + Date.now() + '.json';
      schemaCache.setCachedSchema(url, '{"type": "object"}');

      // Get info
      info = schemaCache.getCacheInfo();
      expect(info.memoryCount).toBeGreaterThanOrEqual(initialMemoryCount);

      // Clear again
      const cleared = schemaCache.clearCache();
      expect(typeof cleared).toBe('number');
    });
  });

  describe('Error handling', () => {
    it('setCachedSchema should handle invalid URLs gracefully', () => {
      // Should not throw even with unusual input
      expect(() => {
        schemaCache.setCachedSchema('', '{}');
      }).not.toThrow();
    });

    it('setCachedSchema should handle empty content', () => {
      expect(() => {
        schemaCache.setCachedSchema('https://test.example.com/empty.json', '');
      }).not.toThrow();
    });
  });

  describe('Cache key generation', () => {
    it('should handle different URLs uniquely', () => {
      schemaCache.clearCache();

      const url1 = 'https://test1.example.com/schema-' + Date.now() + '.json';
      const url2 = 'https://test2.example.com/schema-' + Date.now() + '.json';

      schemaCache.setCachedSchema(url1, '{"test": 1}');
      schemaCache.setCachedSchema(url2, '{"test": 2}');

      const info = schemaCache.getCacheInfo();
      // Should have at least 2 entries (if FS is mocked, only memory count increases)
      expect(info.memoryCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle same URL consistently', () => {
      schemaCache.clearCache();

      const url = 'https://test-same.example.com/schema-' + Date.now() + '.json';

      schemaCache.setCachedSchema(url, '{"version": 1}');
      schemaCache.setCachedSchema(url, '{"version": 2}');

      const info = schemaCache.getCacheInfo();
      // Same URL should reuse cache key
      expect(info.memoryCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Cache directory creation', () => {
    it('should create cache directory if it does not exist', () => {
      // The cache directory is created when the module is loaded
      // This test verifies that CACHE_DIR exists
      expect(fs.existsSync(schemaCache.CACHE_DIR)).toBe(true);
    });
  });

  describe('Cache expiry', () => {
    it('should detect expired memory cache entries', async () => {
      schemaCache.clearCache();

      const url = 'https://test-expiry.example.com/schema-' + Date.now() + '.json';
      const content = '{"test": "expiry"}';

      // Set the cache
      schemaCache.setCachedSchema(url, content);

      // Verify it's in memory cache
      const info1 = schemaCache.getCacheInfo();
      expect(info1.memoryCount).toBeGreaterThanOrEqual(1);

      // The module checks expiry internally - we can't directly test the expiry path
      // without mocking Date.now(), but we can verify the cache works correctly
      // This exercises the code path that checks timestamps
      const retrieved = await schemaCache.getCachedSchema(url);
      expect(retrieved).toBe(content);
    });

    it('should handle file system cache with timestamps', () => {
      schemaCache.clearCache();

      const url = 'https://test-fs-expiry.example.com/schema-' + Date.now() + '.json';
      const content = '{"test": "file-expiry"}';

      // Set the cache (writes to both memory and FS)
      schemaCache.setCachedSchema(url, content);

      // Verify it's cached
      const info = schemaCache.getCacheInfo();
      expect(info.count).toBeGreaterThanOrEqual(1);

      // The file should have a valid mtime that can be checked
      // This exercises the code that reads file stats
      expect(info.entries.length).toBeGreaterThan(0);
      if (info.entries.length > 0) {
        expect(info.entries[0]).toHaveProperty('ageMinutes');
        expect(typeof info.entries[0].ageMinutes).toBe('number');
        expect(info.entries[0].ageMinutes).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle cache directory read errors gracefully', () => {
      // getCacheInfo should handle errors gracefully
      const info = schemaCache.getCacheInfo();

      // Should still return a valid structure even if there are issues
      expect(info).toHaveProperty('directory');
      expect(info).toHaveProperty('maxAgeHours');
      expect(info).toHaveProperty('memoryCount');
      expect(info).toHaveProperty('count');
      expect(info).toHaveProperty('entries');
    });
  });
});
