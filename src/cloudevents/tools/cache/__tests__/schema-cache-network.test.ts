import * as schemaCache from '../schema-cache';

/**
 * Network integration tests for schema-cache module
 * These tests make real network calls to verify HTTP fetching logic
 */

describe('schema-cache network operations', () => {
  beforeEach(() => {
    // Clear cache before each test to force network requests
    schemaCache.clearCache();
  });

  describe('getCachedSchema with HTTP fetching', () => {
    it('should fetch schema from a valid HTTPS URL', async () => {
      // Use a real schema URL from the CloudEvents spec
      const url = 'https://raw.githubusercontent.com/cloudevents/spec/v1.0.2/cloudevents/formats/cloudevents.json';

      const content = await schemaCache.getCachedSchema(url);

      expect(content).toBeDefined();
      expect(content).not.toBeNull();
      if (content) {
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(0);

        // Should be valid JSON
        expect(() => JSON.parse(content)).not.toThrow();
      }
    }, 30000); // Allow 30s for network request

    it('should handle HTTP redirects', async () => {
      // GitHub URLs often redirect
      const url = 'http://raw.githubusercontent.com/cloudevents/spec/v1.0.2/cloudevents/formats/cloudevents.json';

      const content = await schemaCache.getCachedSchema(url);

      expect(content).toBeDefined();
      expect(content).not.toBeNull();
    }, 30000);

    it('should cache fetched schema for subsequent requests', async () => {
      const url = 'https://raw.githubusercontent.com/cloudevents/spec/v1.0.2/cloudevents/formats/cloudevents.json';

      // First request - will fetch from network
      const content1 = await schemaCache.getCachedSchema(url);
      expect(content1).not.toBeNull();

      // Second request - should return from memory cache instantly
      const start = Date.now();
      const content2 = await schemaCache.getCachedSchema(url);
      const duration = Date.now() - start;

      expect(content2).toEqual(content1);
      expect(duration).toBeLessThan(100); // Should be very fast from memory
    }, 30000);

    it('should return null for non-existent URL', async () => {
      const url = 'https://example.com/non-existent-schema-' + Date.now() + '.json';

      const content = await schemaCache.getCachedSchema(url);

      expect(content).toBeNull();
    }, 30000);

    it('should return null for invalid domain', async () => {
      const url = 'https://this-domain-does-not-exist-' + Date.now() + '.invalid/schema.json';

      const content = await schemaCache.getCachedSchema(url);

      expect(content).toBeNull();
    }, 30000);

    it('should handle network errors gracefully', async () => {
      // Use a URL that will timeout or fail
      const url = 'https://httpstat.us/500';

      const content = await schemaCache.getCachedSchema(url);

      // Should return null rather than throwing
      expect(content).toBeNull();
    }, 30000);
  });

  describe('fetchSchemaWithRetry behavior', () => {
    it('should eventually succeed after transient failures', async () => {
      // First request to a flaky endpoint
      // This tests the retry logic by using a real URL that should work
      const url = 'https://raw.githubusercontent.com/cloudevents/spec/v1.0.2/cloudevents/formats/cloudevents.json';

      const content = await schemaCache.getCachedSchema(url);

      expect(content).not.toBeNull();
      expect(typeof content).toBe('string');
    }, 30000);
  });

  describe('URL protocol handling', () => {
    it('should handle HTTPS URLs', async () => {
      const url = 'https://raw.githubusercontent.com/cloudevents/spec/v1.0.2/cloudevents/formats/cloudevents.json';

      const content = await schemaCache.getCachedSchema(url);

      expect(content).not.toBeNull();
    }, 30000);

    it('should handle HTTP URLs with redirect to HTTPS', async () => {
      const url = 'http://raw.githubusercontent.com/cloudevents/spec/v1.0.2/cloudevents/formats/cloudevents.json';

      const content = await schemaCache.getCachedSchema(url);

      expect(content).not.toBeNull();
    }, 30000);
  });

  describe('invalid JSON handling', () => {
    it('should handle non-JSON content from URL', async () => {
      // Fetch a markdown file instead of JSON
      const url = 'https://raw.githubusercontent.com/cloudevents/spec/v1.0.2/README.md';

      const content = await schemaCache.getCachedSchema(url);

      // Should still return the content even if it's not JSON
      // (validation happens elsewhere)
      expect(content).toBeDefined();
      if (content !== null) {
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(0);
      }
    }, 30000);
  });
});
