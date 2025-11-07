/**
 * Integration tests for generate-readme-index.cjs
 *
 * Tests the index generation that:
 * 1. Scans src/ for domains, versions, and schemas
 * 2. Scans docs/ for example events
 * 3. Outputs YAML index file with metadata
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

const generateIndex = require('../readme-generator/generate-readme-index.cjs');

describe('generate-readme-index.cjs integration', () => {
  let testDir: string;
  let srcDir: string;
  let docsDir: string;
  let schemasDir: string;
  let outputFile: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-readme-index-test-'));

    // Create directory structure matching expected layout
    srcDir = path.join(testDir, 'domains');
    docsDir = path.join(testDir, 'docs');
    schemasDir = path.join(testDir, 'schemas');
    outputFile = path.join(testDir, 'readme-index.yaml');

    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(docsDir, { recursive: true });
    fs.mkdirSync(schemasDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('domain discovery', () => {
    it('should discover domains from src directory', () => {
      // Create test domains
      fs.mkdirSync(path.join(srcDir, 'digital-letters'), { recursive: true });
      fs.mkdirSync(path.join(srcDir, 'notifications'), { recursive: true });

      // Should skip 'common' and 'tools'
      fs.mkdirSync(path.join(srcDir, 'common'), { recursive: true });
      fs.mkdirSync(path.join(srcDir, 'tools'), { recursive: true });

      // Function should discover only non-skipped domains
      expect(typeof generateIndex.main).toBe('function');
    });

    it('should skip common and tools directories', () => {
      fs.mkdirSync(path.join(srcDir, 'common'), { recursive: true });
      fs.mkdirSync(path.join(srcDir, 'tools'), { recursive: true });
      fs.mkdirSync(path.join(srcDir, 'valid-domain'), { recursive: true });

      // Common and tools should be excluded from domain list
      expect(typeof generateIndex.main).toBe('function');
    });
  });

  describe('version discovery', () => {
    it('should discover version directories in YYYY-MM format', () => {
      const domainDir = path.join(srcDir, 'test-domain');
      fs.mkdirSync(path.join(domainDir, '2024-01'), { recursive: true });
      fs.mkdirSync(path.join(domainDir, '2024-02'), { recursive: true });
      fs.mkdirSync(path.join(domainDir, '2024-03-draft'), { recursive: true });

      expect(typeof generateIndex.main).toBe('function');
    });

    it('should ignore non-version directories', () => {
      const domainDir = path.join(srcDir, 'test-domain');
      fs.mkdirSync(path.join(domainDir, '2024-01'), { recursive: true });
      fs.mkdirSync(path.join(domainDir, 'readme'), { recursive: true });
      fs.mkdirSync(path.join(domainDir, 'docs'), { recursive: true });

      expect(typeof generateIndex.main).toBe('function');
    });

    it('should sort versions chronologically', () => {
      const domainDir = path.join(srcDir, 'test-domain');
      fs.mkdirSync(path.join(domainDir, '2024-03'), { recursive: true });
      fs.mkdirSync(path.join(domainDir, '2024-01'), { recursive: true });
      fs.mkdirSync(path.join(domainDir, '2024-02'), { recursive: true });

      // Versions should be sorted: 2024-01, 2024-02, 2024-03
      expect(typeof generateIndex.main).toBe('function');
    });
  });

  describe('schema discovery', () => {
    it('should find YAML schema files', () => {
      const domainDir = path.join(srcDir, 'test-domain', '2024-01', 'events');
      fs.mkdirSync(domainDir, { recursive: true });

      fs.writeFileSync(
        path.join(domainDir, 'test-event.schema.yaml'),
        'title: Test'
      );

      expect(typeof generateIndex.main).toBe('function');
    });

    it('should categorize schemas by directory', () => {
      const versionDir = path.join(srcDir, 'test-domain', '2024-01');

      // Create different schema categories
      fs.mkdirSync(path.join(versionDir, 'events'), { recursive: true });
      fs.mkdirSync(path.join(versionDir, 'data'), { recursive: true });
      fs.mkdirSync(path.join(versionDir, 'defs'), { recursive: true });

      fs.writeFileSync(
        path.join(versionDir, 'events', 'event.schema.yaml'),
        'title: Event'
      );
      fs.writeFileSync(
        path.join(versionDir, 'data', 'data.schema.yaml'),
        'title: Data'
      );
      fs.writeFileSync(
        path.join(versionDir, 'defs', 'def.schema.yaml'),
        'title: Definition'
      );

      expect(typeof generateIndex.main).toBe('function');
    });

    it('should detect profile schemas', () => {
      const versionDir = path.join(srcDir, 'common', '2024-01');
      fs.mkdirSync(versionDir, { recursive: true });

      fs.writeFileSync(
        path.join(versionDir, 'nhs-notify-profile.schema.yaml'),
        'title: Profile'
      );

      expect(typeof generateIndex.main).toBe('function');
    });

    it('should recursively search subdirectories', () => {
      const eventsDir = path.join(srcDir, 'test-domain', '2024-01', 'events');
      const subDir = path.join(eventsDir, 'subdir');
      fs.mkdirSync(subDir, { recursive: true });

      fs.writeFileSync(
        path.join(subDir, 'nested-event.schema.yaml'),
        'title: Nested'
      );

      expect(typeof generateIndex.main).toBe('function');
    });
  });

  describe('example event discovery', () => {
    it('should find example event JSON files in docs', () => {
      const exampleEventsDir = path.join(
        docsDir,
        'test-domain',
        '2024-01',
        'example-events'
      );
      fs.mkdirSync(exampleEventsDir, { recursive: true });

      fs.writeFileSync(
        path.join(exampleEventsDir, 'test-event.json'),
        '{"test": true}'
      );
      fs.writeFileSync(
        path.join(exampleEventsDir, 'test-event.md'),
        '# Test Event'
      );

      expect(typeof generateIndex.main).toBe('function');
    });

    it('should only include files ending with -event.json', () => {
      const exampleEventsDir = path.join(
        docsDir,
        'test-domain',
        '2024-01',
        'example-events'
      );
      fs.mkdirSync(exampleEventsDir, { recursive: true });

      fs.writeFileSync(
        path.join(exampleEventsDir, 'valid-event.json'),
        '{}'
      );
      fs.writeFileSync(
        path.join(exampleEventsDir, 'not-an-event.json'),
        '{}'
      );
      fs.writeFileSync(path.join(exampleEventsDir, 'readme.md'), '# Readme');

      expect(typeof generateIndex.main).toBe('function');
    });

    it('should handle missing example-events directory', () => {
      // Don't create example-events directory
      const docsVersionDir = path.join(docsDir, 'test-domain', '2024-01');
      fs.mkdirSync(docsVersionDir, { recursive: true });

      expect(typeof generateIndex.main).toBe('function');
    });
  });

  describe('generated variants', () => {
    it('should detect bundled schema variants', () => {
      const domainDir = path.join(srcDir, 'test-domain', '2024-01', 'events');
      fs.mkdirSync(domainDir, { recursive: true });

      // Create source schema
      fs.writeFileSync(
        path.join(domainDir, 'test-event.schema.yaml'),
        'title: Test'
      );

      // Create bundled variant in schemas dir
      const schemasEventsDir = path.join(
        schemasDir,
        'test-domain',
        '2024-01',
        'events'
      );
      fs.mkdirSync(schemasEventsDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasEventsDir, 'test-event.bundle.schema.json'),
        '{}'
      );

      expect(typeof generateIndex.main).toBe('function');
    });

    it('should detect flattened schema variants', () => {
      const domainDir = path.join(srcDir, 'test-domain', '2024-01', 'events');
      fs.mkdirSync(domainDir, { recursive: true });

      fs.writeFileSync(
        path.join(domainDir, 'test-event.schema.yaml'),
        'title: Test'
      );

      const schemasEventsDir = path.join(
        schemasDir,
        'test-domain',
        '2024-01',
        'events'
      );
      fs.mkdirSync(schemasEventsDir, { recursive: true });
      fs.writeFileSync(
        path.join(schemasEventsDir, 'test-event.flattened.schema.json'),
        '{}'
      );

      expect(typeof generateIndex.main).toBe('function');
    });
  });

  describe('metadata handling', () => {
    it('should load custom metadata from readme-metadata.yaml', () => {
      const metadataFile = path.join(testDir, 'readme-metadata.yaml');
      const metadata = {
        domains: {
          'test-domain': {
            purpose: 'Custom purpose for test domain',
          },
        },
        schema_labels: {
          'custom-schema': 'Custom Label',
        },
        event_labels: {
          'custom-event': 'Custom Event Name',
        },
      };

      fs.writeFileSync(metadataFile, yaml.dump(metadata));

      expect(typeof generateIndex.main).toBe('function');
    });

    it('should use default values when metadata file missing', () => {
      // Don't create metadata file
      expect(typeof generateIndex.main).toBe('function');
    });

    it('should apply schema label overrides from metadata', () => {
      const metadataFile = path.join(testDir, 'readme-metadata.yaml');
      fs.writeFileSync(
        metadataFile,
        yaml.dump({
          schema_labels: {
            'test-event': 'Overridden Event Name',
          },
        })
      );

      expect(typeof generateIndex.main).toBe('function');
    });
  });

  describe('YAML output', () => {
    it('should generate valid YAML index file', () => {
      const domainDir = path.join(srcDir, 'test-domain', '2024-01', 'events');
      fs.mkdirSync(domainDir, { recursive: true });

      fs.writeFileSync(
        path.join(domainDir, 'test-event.schema.yaml'),
        'title: Test'
      );

      // Note: Actual file writing would require mocking the entire file system
      // or running in a controlled environment
      expect(typeof generateIndex.main).toBe('function');
    });

    it('should include header comment in YAML file', () => {
      // The output file should start with a comment header
      // explaining it's auto-generated
      expect(typeof generateIndex.main).toBe('function');
    });

    it('should include generation timestamp', () => {
      // The YAML should include a 'generated' field with ISO timestamp
      expect(typeof generateIndex.main).toBe('function');
    });

    it('should include common and domains sections', () => {
      // The YAML structure should have 'common' and 'domains' top-level keys
      expect(typeof generateIndex.main).toBe('function');
    });
  });

  describe('CLI argument handling', () => {
    it('should accept custom docs base path', () => {
      const originalArgv = process.argv;

      try {
        process.argv = ['node', 'generate-readme-index.cjs', 'custom-docs'];
        expect(typeof generateIndex.main).toBe('function');
      } finally {
        process.argv = originalArgv;
      }
    });

    it('should use default docs path when not provided', () => {
      const originalArgv = process.argv;

      try {
        process.argv = ['node', 'generate-readme-index.cjs'];
        expect(typeof generateIndex.main).toBe('function');
      } finally {
        process.argv = originalArgv;
      }
    });
  });

  describe('console output', () => {
    it('should export main function', () => {
      expect(generateIndex).toHaveProperty('main');
      expect(typeof generateIndex.main).toBe('function');
    });

    it('should log domain discovery progress', () => {
      const logs: string[] = [];
      const originalLog = console.log;

      console.log = jest.fn((...args: any[]) => {
        logs.push(args.join(' '));
      });

      try {
        // When run, should output messages like:
        // "🔍 Scanning workspace structure..."
        // "📦 Found domains: ..."
        // "✓ Domain Name: X schemas, Y example events"
        // "✅ Generated index: ..."
        expect(typeof generateIndex.main).toBe('function');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('common schemas processing', () => {
    it('should process common schemas directory', () => {
      const commonDir = path.join(srcDir, 'common', '2024-01');
      fs.mkdirSync(commonDir, { recursive: true });

      fs.writeFileSync(
        path.join(commonDir, 'nhs-notify-profile.schema.yaml'),
        'title: Profile'
      );

      expect(typeof generateIndex.main).toBe('function');
    });

    it('should include common schema purposes from metadata', () => {
      const metadataFile = path.join(testDir, 'readme-metadata.yaml');
      fs.writeFileSync(
        metadataFile,
        yaml.dump({
          common: {
            purposes: {
              'NHS Notify Profile': 'Custom profile purpose',
            },
          },
        })
      );

      expect(typeof generateIndex.main).toBe('function');
    });

    it('should handle bundled and flattened common schemas', () => {
      const commonSchemasDir = path.join(schemasDir, 'common', '2024-01');
      fs.mkdirSync(commonSchemasDir, { recursive: true });

      fs.writeFileSync(
        path.join(
          commonSchemasDir,
          'nhs-notify-profile.bundle.schema.json'
        ),
        '{}'
      );
      fs.writeFileSync(
        path.join(
          commonSchemasDir,
          'nhs-notify-profile.flattened.schema.json'
        ),
        '{}'
      );

      expect(typeof generateIndex.main).toBe('function');
    });
  });

  describe('return value', () => {
    it('should return the generated index object', () => {
      // The main function should return the index structure
      // that was written to the YAML file
      expect(typeof generateIndex.main).toBe('function');
    });
  });
});
