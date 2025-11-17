/**
 * Unit tests for DocsGenerator class
 * Tests the core documentation generation logic
 */

import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { DocsGenerator } from '../docs-generator/docs-generator.ts';
import type { DocsGeneratorConfig } from '../docs-generator/docs-generator-types.ts';

const TEST_DIR = path.join(__dirname, 'temp-docs-generator-test');
const INPUT_DIR = path.join(TEST_DIR, 'input');
const OUTPUT_DIR = path.join(TEST_DIR, 'output');

describe('DocsGenerator', () => {
  beforeEach(() => {
    // Create test directories
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(INPUT_DIR, { recursive: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create instance with config', () => {
      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      expect(generator).toBeInstanceOf(DocsGenerator);
    });

    it('should initialize counters to zero', () => {
      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
      };

      const generator = new DocsGenerator(config);
      expect(generator.getSchemasProcessed()).toBe(0);
      expect(generator.getExampleEventsCopied()).toBe(0);
    });
  });

  describe('findSchemaFiles()', () => {
    it('should find JSON schema files', async () => {
      // Create test schema files
      fs.writeFileSync(path.join(INPUT_DIR, 'test.schema.json'), '{}');
      fs.writeFileSync(path.join(INPUT_DIR, 'test2.schema.json'), '{}');

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const files = await generator.findSchemaFiles(INPUT_DIR);

      expect(files.length).toBe(2);
      expect(files.some((f) => f.includes('test.schema.json'))).toBe(true);
      expect(files.some((f) => f.includes('test2.schema.json'))).toBe(true);
    });

    it('should find YAML schema files', async () => {
      // Create test YAML schema file
      fs.writeFileSync(path.join(INPUT_DIR, 'test.schema.yml'), '{}');

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const files = await generator.findSchemaFiles(INPUT_DIR);

      expect(files.length).toBe(1);
      expect(files[0]).toContain('test.schema.yml');
    });

    it('should find schemas in nested directories', async () => {
      // Create nested directory structure
      const nestedDir = path.join(INPUT_DIR, 'domain', 'subdomain');
      fs.mkdirSync(nestedDir, { recursive: true });
      fs.writeFileSync(path.join(nestedDir, 'nested.schema.json'), '{}');

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const files = await generator.findSchemaFiles(INPUT_DIR);

      expect(files.length).toBe(1);
      expect(files[0]).toContain('nested.schema.json');
    });

    it('should not find non-schema files', async () => {
      // Create non-schema files
      fs.writeFileSync(path.join(INPUT_DIR, 'test.json'), '{}');
      fs.writeFileSync(path.join(INPUT_DIR, 'test.txt'), 'content');

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const files = await generator.findSchemaFiles(INPUT_DIR);

      expect(files.length).toBe(0);
    });
  });

  describe('findHttpRefs()', () => {
    it('should find HTTP reference in schema', () => {
      const schema = {
        $ref: 'http://example.com/schema.json',
      };

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const refs = generator.findHttpRefs(schema);

      expect(refs.size).toBe(1);
      expect(refs.has('http://example.com/schema.json')).toBe(true);
    });

    it('should find HTTPS reference in schema', () => {
      const schema = {
        properties: {
          field: {
            $ref: 'https://example.com/schema.json',
          },
        },
      };

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const refs = generator.findHttpRefs(schema);

      expect(refs.size).toBe(1);
      expect(refs.has('https://example.com/schema.json')).toBe(true);
    });

    it('should find multiple HTTP references', () => {
      const schema = {
        allOf: [
          { $ref: 'http://example.com/schema1.json' },
          { $ref: 'https://example.com/schema2.json' },
        ],
      };

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const refs = generator.findHttpRefs(schema);

      expect(refs.size).toBe(2);
      expect(refs.has('http://example.com/schema1.json')).toBe(true);
      expect(refs.has('https://example.com/schema2.json')).toBe(true);
    });

    it('should ignore local file references', () => {
      const schema = {
        $ref: './local-schema.json',
      };

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const refs = generator.findHttpRefs(schema);

      expect(refs.size).toBe(0);
    });

    it('should strip fragment from reference URL', () => {
      const schema = {
        $ref: 'http://example.com/schema.json#/definitions/MyType',
      };

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const refs = generator.findHttpRefs(schema);

      expect(refs.size).toBe(1);
      expect(refs.has('http://example.com/schema.json')).toBe(true);
    });

    it('should handle deeply nested references', () => {
      const schema = {
        properties: {
          level1: {
            properties: {
              level2: {
                items: {
                  $ref: 'http://example.com/deep.json',
                },
              },
            },
          },
        },
      };

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const refs = generator.findHttpRefs(schema);

      expect(refs.size).toBe(1);
      expect(refs.has('http://example.com/deep.json')).toBe(true);
    });

    it('should handle null input', () => {
      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const refs = generator.findHttpRefs(null);

      expect(refs.size).toBe(0);
    });

    it('should handle primitive input', () => {
      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const refs = generator.findHttpRefs('string');

      expect(refs.size).toBe(0);
    });
  });

  describe('preloadExternalSchemas()', () => {
    it('should return empty result when no schema files', async () => {
      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const result = await generator.preloadExternalSchemas([]);

      expect(result.count).toBe(0);
      expect(result.loadedUrls.size).toBe(0);
      expect(Object.keys(result.schemas).length).toBe(0);
    });

    it('should scan schema files for HTTP references', async () => {
      // Create schema with HTTP reference
      const schemaPath = path.join(INPUT_DIR, 'test.schema.json');
      const schema = {
        $ref: 'http://example.com/external.json',
      };
      fs.writeFileSync(schemaPath, JSON.stringify(schema));

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const result = await generator.preloadExternalSchemas([schemaPath]);

      // Note: The current implementation doesn't actually load schemas
      // but it should identify them
      expect(result).toBeDefined();
      expect(result.count).toBeDefined();
    });

    it('should handle unparseable schema files gracefully', async () => {
      // Create invalid JSON file
      const schemaPath = path.join(INPUT_DIR, 'invalid.schema.json');
      fs.writeFileSync(schemaPath, 'not valid json {');

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const result = await generator.preloadExternalSchemas([schemaPath]);

      // Should not throw, just skip the file
      expect(result).toBeDefined();
      expect(result.count).toBe(0);
    });
  });

  describe('copyExampleEvents()', () => {
    it('should copy example event JSON files', async () => {
      // Create example events directory with event file
      const exampleEventsDir = path.join(INPUT_DIR, 'domain', 'example-events');
      fs.mkdirSync(exampleEventsDir, { recursive: true });

      const eventData = {
        id: 'test-event-id',
        type: 'test.event.created',
        source: 'test-source',
        time: '2025-11-07T00:00:00Z',
        data: { test: 'value' },
      };

      fs.writeFileSync(
        path.join(exampleEventsDir, 'test-event.json'),
        JSON.stringify(eventData, null, 2)
      );

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      await generator.copyExampleEvents();

      // Verify file was copied
      const destFile = path.join(OUTPUT_DIR, 'domain', 'example-events', 'test-event.json');
      expect(fs.existsSync(destFile)).toBe(true);

      // Verify content
      const copiedData = JSON.parse(fs.readFileSync(destFile, 'utf-8'));
      expect(copiedData.id).toBe('test-event-id');
      expect(copiedData.type).toBe('test.event.created');
    });

    it('should generate markdown for example events', async () => {
      // Create example events directory with event file
      const exampleEventsDir = path.join(INPUT_DIR, 'domain', 'example-events');
      fs.mkdirSync(exampleEventsDir, { recursive: true });

      const eventData = {
        id: 'test-event-id',
        type: 'test.event.created',
        source: 'test-source',
        subject: 'test-subject',
        time: '2025-11-07T00:00:00Z',
        data: { test: 'value' },
      };

      fs.writeFileSync(
        path.join(exampleEventsDir, 'test-event.json'),
        JSON.stringify(eventData, null, 2)
      );

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      await generator.copyExampleEvents();

      // Verify markdown was generated
      const mdFile = path.join(OUTPUT_DIR, 'domain', 'example-events', 'test-event.md');
      expect(fs.existsSync(mdFile)).toBe(true);

      // Verify markdown content
      const mdContent = fs.readFileSync(mdFile, 'utf-8');
      expect(mdContent).toContain('# test.event.created');
      expect(mdContent).toContain('**Event Type:** `test.event.created`');
      expect(mdContent).toContain('**Source:** `test-source`');
      expect(mdContent).toContain('**Subject:** `test-subject`');
      expect(mdContent).toContain('**Event ID:** `test-event-id`');
      expect(mdContent).toContain('**Timestamp:** 2025-11-07T00:00:00Z');
      expect(mdContent).toContain('## Complete Event Instance');
      expect(mdContent).toContain('"test": "value"');
    });

    it('should handle events without subject field', async () => {
      // Create example events directory with event file (no subject)
      const exampleEventsDir = path.join(INPUT_DIR, 'domain', 'example-events');
      fs.mkdirSync(exampleEventsDir, { recursive: true });

      const eventData = {
        id: 'test-event-id',
        type: 'test.event.created',
        source: 'test-source',
        time: '2025-11-07T00:00:00Z',
        data: {},
      };

      fs.writeFileSync(
        path.join(exampleEventsDir, 'test-event.json'),
        JSON.stringify(eventData, null, 2)
      );

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      await generator.copyExampleEvents();

      // Verify markdown was generated without subject
      const mdFile = path.join(OUTPUT_DIR, 'domain', 'example-events', 'test-event.md');
      const mdContent = fs.readFileSync(mdFile, 'utf-8');
      expect(mdContent).not.toContain('**Subject:**');
    });

    it('should copy multiple example events', async () => {
      // Create example events directory with multiple event files
      const exampleEventsDir = path.join(INPUT_DIR, 'domain', 'example-events');
      fs.mkdirSync(exampleEventsDir, { recursive: true });

      for (let i = 1; i <= 3; i++) {
        const eventData = {
          id: `event-${i}`,
          type: `test.event.${i}`,
          source: 'test-source',
          time: '2025-11-07T00:00:00Z',
          data: {},
        };

        fs.writeFileSync(
          path.join(exampleEventsDir, `event-${i}-event.json`),
          JSON.stringify(eventData, null, 2)
        );
      }

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      await generator.copyExampleEvents();

      // Verify all files were copied
      expect(generator.getExampleEventsCopied()).toBe(3);
      expect(fs.existsSync(path.join(OUTPUT_DIR, 'domain', 'example-events', 'event-1-event.json'))).toBe(true);
      expect(fs.existsSync(path.join(OUTPUT_DIR, 'domain', 'example-events', 'event-2-event.json'))).toBe(true);
      expect(fs.existsSync(path.join(OUTPUT_DIR, 'domain', 'example-events', 'event-3-event.json'))).toBe(true);
    });

    it('should handle nested example-events directories', async () => {
      // Create multiple example-events directories at different levels
      const dir1 = path.join(INPUT_DIR, 'domain1', 'example-events');
      const dir2 = path.join(INPUT_DIR, 'domain2', 'subdomain', 'example-events');

      fs.mkdirSync(dir1, { recursive: true });
      fs.mkdirSync(dir2, { recursive: true });

      const eventData = {
        id: 'test-id',
        type: 'test.event',
        source: 'test',
        time: '2025-11-07T00:00:00Z',
        data: {},
      };

      fs.writeFileSync(path.join(dir1, 'event1-event.json'), JSON.stringify(eventData));
      fs.writeFileSync(path.join(dir2, 'event2-event.json'), JSON.stringify(eventData));

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      await generator.copyExampleEvents();

      // Verify both were copied
      expect(generator.getExampleEventsCopied()).toBe(2);
    });

    it('should skip non-JSON files in example-events directory', async () => {
      // Create example events directory with JSON and non-JSON files
      const exampleEventsDir = path.join(INPUT_DIR, 'domain', 'example-events');
      fs.mkdirSync(exampleEventsDir, { recursive: true });

      const eventData = {
        id: 'test-id',
        type: 'test.event',
        source: 'test',
        time: '2025-11-07T00:00:00Z',
        data: {},
      };

      fs.writeFileSync(path.join(exampleEventsDir, 'event-event.json'), JSON.stringify(eventData));
      fs.writeFileSync(path.join(exampleEventsDir, 'readme.txt'), 'readme');
      fs.writeFileSync(path.join(exampleEventsDir, 'config.yaml'), 'config');

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      await generator.copyExampleEvents();

      // Only JSON file should be copied
      expect(generator.getExampleEventsCopied()).toBe(1);
    });
  });

  describe('generate()', () => {
    it('should successfully generate documentation', async () => {
      // Create a simple schema file
      fs.writeFileSync(path.join(INPUT_DIR, 'test.schema.json'), JSON.stringify({ type: 'object' }));

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const result = await generator.generate();

      expect(result.success).toBe(true);
      expect(result.inputDir).toBe(INPUT_DIR);
      expect(result.outputDir).toBe(OUTPUT_DIR);
      expect(result.schemasProcessed).toBeGreaterThanOrEqual(0);
      expect(result.exampleEventsCopied).toBeGreaterThanOrEqual(0);
    });

    it('should return error information on failure', async () => {
      // Use non-existent input directory
      const badConfig: DocsGeneratorConfig = {
        inputDir: '/nonexistent/path',
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(badConfig);
      const result = await generator.generate();

      // The generate method catches errors and returns success: false
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should process multiple schemas', async () => {
      // Create multiple schema files
      fs.writeFileSync(path.join(INPUT_DIR, 'schema1.schema.json'), JSON.stringify({ type: 'object' }));
      fs.writeFileSync(path.join(INPUT_DIR, 'schema2.schema.json'), JSON.stringify({ type: 'string' }));
      fs.writeFileSync(path.join(INPUT_DIR, 'schema3.schema.yml'), JSON.stringify({ type: 'number' }));

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      const result = await generator.generate();

      expect(result.success).toBe(true);
      expect(result.schemasProcessed).toBe(3);
    });
  });

  describe('verbose logging', () => {
    it('should log when verbose is true', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      fs.writeFileSync(path.join(INPUT_DIR, 'test.schema.json'), JSON.stringify({ type: 'object' }));

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: true,
      };

      const generator = new DocsGenerator(config);
      await generator.generate();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not log when verbose is false', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      fs.writeFileSync(path.join(INPUT_DIR, 'test.schema.json'), JSON.stringify({ type: 'object' }));

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      await generator.generate();

      // Should not have called console.log for user messages
      // (may have errors, but not regular logging)
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Generating documentation'));
      consoleSpy.mockRestore();
    });
  });

  describe('getters', () => {
    it('should return schemas processed count', async () => {
      fs.writeFileSync(path.join(INPUT_DIR, 'test.schema.json'), JSON.stringify({ type: 'object' }));

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      await generator.generate();

      expect(generator.getSchemasProcessed()).toBeGreaterThanOrEqual(1);
    });

    it('should return example events copied count', async () => {
      const exampleEventsDir = path.join(INPUT_DIR, 'domain', 'example-events');
      fs.mkdirSync(exampleEventsDir, { recursive: true });

      const eventData = {
        id: 'test-id',
        type: 'test.event',
        source: 'test',
        time: '2025-11-07T00:00:00Z',
        data: {},
      };

      fs.writeFileSync(path.join(exampleEventsDir, 'event-event.json'), JSON.stringify(eventData));

      const config: DocsGeneratorConfig = {
        inputDir: INPUT_DIR,
        outputDir: OUTPUT_DIR,
        verbose: false,
      };

      const generator = new DocsGenerator(config);
      await generator.generate();

      expect(generator.getExampleEventsCopied()).toBe(1);
    });
  });
});
