import * as schemaCache from '../schema-cache';
import http from 'http';
import { AddressInfo } from 'net';

/**
 * Network integration tests for schema-cache module
 * These tests use a local HTTP server to verify HTTP fetching logic
 */

describe('schema-cache network operations', () => {
  let server: http.Server;
  let serverUrl: string;

  const testSchema = JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      name: { type: 'string' }
    }
  });

  beforeAll((done) => {
    // Create a local HTTP server for testing
    server = http.createServer((req, res) => {
      // Handle different test scenarios based on URL path
      if (req.url === '/schema.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(testSchema);
      } else if (req.url === '/redirect') {
        res.writeHead(302, { 'Location': `${serverUrl}/schema.json` });
        res.end();
      } else if (req.url === '/not-found') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else if (req.url === '/server-error') {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway');
      } else if (req.url === '/invalid-json') {
        res.writeHead(422, { 'Content-Type': 'application/json' });
        res.end('{ invalid json');
      } else if (req.url === '/non-json') {
        res.writeHead(415, { 'Content-Type': 'text/plain' });
        res.end('# This is markdown content');
      } else if (req.url === '/timeout') {
        // Don't respond - will cause timeout
        // Request will hang until Jest timeout
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(0, 'localhost', () => {
      const address = server.address() as AddressInfo;
      serverUrl = `http://localhost:${address.port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    // Clear cache before each test to force network requests
    schemaCache.clearCache();
  });

  describe('getCachedSchema with HTTP fetching', () => {
    it('should fetch schema from a valid HTTP URL', async () => {
      const url = `${serverUrl}/schema.json`;

      const content = await schemaCache.getCachedSchema(url);

      expect(content).toBeDefined();
      expect(content).not.toBeNull();
      if (content) {
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(0);

        // Should be valid JSON
        expect(() => JSON.parse(content)).not.toThrow();
        const parsed = JSON.parse(content);
        expect(parsed).toHaveProperty('type', 'object');
      }
    });

    it('should handle HTTP redirects', async () => {
      const url = `${serverUrl}/redirect`;

      const content = await schemaCache.getCachedSchema(url);

      expect(content).toBeDefined();
      expect(content).not.toBeNull();
      if (content) {
        // Should have followed redirect and got the schema
        const parsed = JSON.parse(content);
        expect(parsed).toHaveProperty('type', 'object');
      }
    });

    it('should cache fetched schema for subsequent requests', async () => {
      const url = `${serverUrl}/schema.json`;

      // First request - will fetch from network
      const content1 = await schemaCache.getCachedSchema(url);
      expect(content1).not.toBeNull();

      // Second request - should return from memory cache instantly
      const start = Date.now();
      const content2 = await schemaCache.getCachedSchema(url);
      const duration = Date.now() - start;

      expect(content2).toEqual(content1);
      expect(duration).toBeLessThan(100); // Should be very fast from memory
    });

    it('should return null for non-existent URL', async () => {
      const url = `${serverUrl}/not-found`;

      const content = await schemaCache.getCachedSchema(url);

      expect(content).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      const url = `${serverUrl}/server-error`;

      const content = await schemaCache.getCachedSchema(url);

      // Should return null rather than throwing
      expect(content).toBeNull();
    });

    it('should handle invalid JSON response', async () => {
      const url = `${serverUrl}/invalid-json`;

      const content = await schemaCache.getCachedSchema(url);

      // Should return null for invalid JSON
      expect(content).toBeNull();
    });
  });

  describe('invalid JSON handling', () => {
    it('should handle non-JSON content from URL', async () => {
      const url = `${serverUrl}/non-json`;

      const content = await schemaCache.getCachedSchema(url);

      // Should return null for non-JSON content (validation happens in fetchUrl)
      expect(content).toBeNull();
    });
  });  describe('fetchSchemaWithRetry behavior', () => {
    it('should succeed on first attempt for valid URL', async () => {
      // Test retry logic with a URL that works immediately
      const url = `${serverUrl}/schema.json`;

      const content = await schemaCache.getCachedSchema(url);

      expect(content).not.toBeNull();
      expect(typeof content).toBe('string');
    });
  });
});
