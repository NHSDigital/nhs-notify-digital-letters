/**
 * Unit tests for ReadmeIndexGenerator class
 *
 * Tests the class methods for generating YAML index from workspace structure.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { ReadmeIndexGenerator } from '../readme-generator/readme-index-generator.ts';

describe('ReadmeIndexGenerator', () => {
  let testDir: string;
  let srcDir: string;
  let docsDir: string;
  let schemasDir: string;
  let generator: ReadmeIndexGenerator;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-index-gen-test-'));
    fs.mkdirSync(testDir, { recursive: true });

    srcDir = path.join(testDir, 'domains');
    docsDir = path.join(testDir, 'docs');
    schemasDir = path.join(testDir, 'schemas');

    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(docsDir, { recursive: true });
    fs.mkdirSync(schemasDir, { recursive: true });

    generator = new ReadmeIndexGenerator({
      rootDir: testDir,
      verbose: false,
    });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('constructor and configuration', () => {
    it('should initialize with default paths', () => {
      expect(generator.getRootDir()).toBe(testDir);
      expect(generator.getSrcDir()).toBe(path.join(testDir, 'domains'));
      expect(generator.getDocsDir()).toBe(path.join(testDir, 'docs'));
    });

    it('should accept custom paths', () => {
      const customGenerator = new ReadmeIndexGenerator({
        rootDir: testDir,
        srcDir: path.join(testDir, 'custom-src'),
        docsDir: path.join(testDir, 'custom-docs'),
        schemasDir: path.join(testDir, 'custom-schemas'),
      });

      expect(customGenerator.getSrcDir()).toBe(
        path.join(testDir, 'custom-src')
      );
      expect(customGenerator.getDocsDir()).toBe(
        path.join(testDir, 'custom-docs')
      );
    });

    it('should load metadata from file if it exists', () => {
      const metadataFile = path.join(testDir, 'readme-metadata.yaml');
      fs.writeFileSync(
        metadataFile,
        yaml.dump({
          domains: { 'test-domain': { purpose: 'Custom purpose' } },
        })
      );

      const gen = new ReadmeIndexGenerator({
        rootDir: testDir,
      });

      const metadata = gen.getMetadata();
      expect(metadata.domains).toBeDefined();
      expect(metadata.domains!['test-domain']).toBeDefined();
      expect(metadata.domains!['test-domain'].purpose).toBe('Custom purpose');
    });

    it('should use default metadata if file does not exist', () => {
      const metadata = generator.getMetadata();
      expect(metadata).toBeDefined();
      expect(metadata.domains).toBeDefined();
      expect(metadata.common).toBeDefined();
    });
  });

  describe('generate() - domain discovery', () => {
    it('should discover domains from src directory', () => {
      // Create test domains with versions
      const domain1Dir = path.join(srcDir, 'domain1', '2024-01');
      const domain2Dir = path.join(srcDir, 'domain2', '2024-01');
      fs.mkdirSync(domain1Dir, { recursive: true });
      fs.mkdirSync(domain2Dir, { recursive: true });

      const index = generator.generate();

      expect(index.domains).toHaveLength(2);
      expect(index.domains.map((d) => d.name).sort()).toEqual([
        'domain1',
        'domain2',
      ]);
    });

    it('should skip common and tools directories', () => {
      // Create directories that should be skipped
      fs.mkdirSync(path.join(srcDir, 'common', '2024-01'), {
        recursive: true,
      });
      fs.mkdirSync(path.join(srcDir, 'tools', '2024-01'), {
        recursive: true,
      });
      fs.mkdirSync(path.join(srcDir, 'valid-domain', '2024-01'), {
        recursive: true,
      });

      const index = generator.generate();

      expect(index.domains).toHaveLength(1);
      expect(index.domains[0].name).toBe('valid-domain');
    });

    it('should skip domains without version directories', () => {
      fs.mkdirSync(path.join(srcDir, 'domain-no-versions'), {
        recursive: true,
      });
      fs.mkdirSync(path.join(srcDir, 'domain-with-version', '2024-01'), {
        recursive: true,
      });

      const index = generator.generate();

      expect(index.domains).toHaveLength(1);
      expect(index.domains[0].name).toBe('domain-with-version');
    });
  });

  describe('generate() - version discovery', () => {
    it('should discover YYYY-MM version directories', () => {
      const domainDir = path.join(srcDir, 'test-domain');
      fs.mkdirSync(path.join(domainDir, '2024-01'), { recursive: true });
      fs.mkdirSync(path.join(domainDir, '2024-02'), { recursive: true });

      const index = generator.generate();

      expect(index.domains[0].versions).toHaveLength(2);
      expect(index.domains[0].versions.map((v) => v.version)).toEqual([
        '2024-01',
        '2024-02',
      ]);
    });

    it('should discover YYYY-MM-draft version directories', () => {
      const domainDir = path.join(srcDir, 'test-domain');
      fs.mkdirSync(path.join(domainDir, '2024-01-draft'), {
        recursive: true,
      });

      const index = generator.generate();

      expect(index.domains[0].versions).toHaveLength(1);
      expect(index.domains[0].versions[0].version).toBe('2024-01-draft');
    });

    it('should ignore non-version directories', () => {
      const domainDir = path.join(srcDir, 'test-domain');
      fs.mkdirSync(path.join(domainDir, '2024-01'), { recursive: true });
      fs.mkdirSync(path.join(domainDir, 'docs'), { recursive: true });
      fs.mkdirSync(path.join(domainDir, 'readme'), { recursive: true });

      const index = generator.generate();

      expect(index.domains[0].versions).toHaveLength(1);
      expect(index.domains[0].versions[0].version).toBe('2024-01');
    });

    it('should sort versions chronologically', () => {
      const domainDir = path.join(srcDir, 'test-domain');
      fs.mkdirSync(path.join(domainDir, '2024-03'), { recursive: true });
      fs.mkdirSync(path.join(domainDir, '2024-01'), { recursive: true });
      fs.mkdirSync(path.join(domainDir, '2024-02'), { recursive: true });

      const index = generator.generate();

      expect(index.domains[0].versions.map((v) => v.version)).toEqual([
        '2024-01',
        '2024-02',
        '2024-03',
      ]);
    });
  });

  describe('generate() - schema discovery', () => {
    it('should find YAML schema files', () => {
      const eventsDir = path.join(srcDir, 'test-domain', '2024-01', 'events');
      fs.mkdirSync(eventsDir, { recursive: true });
      fs.writeFileSync(
        path.join(eventsDir, 'test-event.schema.yaml'),
        'title: Test'
      );

      const index = generator.generate();

      expect(index.domains[0].versions[0].schemas).toHaveLength(1);
      expect(index.domains[0].versions[0].schemas[0].source).toContain(
        'test-event.schema.yaml'
      );
    });

    it('should categorize schemas by directory - events', () => {
      const eventsDir = path.join(srcDir, 'test-domain', '2024-01', 'events');
      fs.mkdirSync(eventsDir, { recursive: true });
      fs.writeFileSync(
        path.join(eventsDir, 'event.schema.yaml'),
        'title: Event'
      );

      const index = generator.generate();

      expect(index.domains[0].versions[0].schemas[0].category).toBe('events');
    });

    it('should categorize schemas by directory - data', () => {
      const dataDir = path.join(srcDir, 'test-domain', '2024-01', 'data');
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(
        path.join(dataDir, 'data.schema.yaml'),
        'title: Data'
      );

      const index = generator.generate();

      expect(index.domains[0].versions[0].schemas[0].category).toBe('data');
    });

    it('should categorize schemas by directory - definitions', () => {
      const defsDir = path.join(srcDir, 'test-domain', '2024-01', 'defs');
      fs.mkdirSync(defsDir, { recursive: true });
      fs.writeFileSync(path.join(defsDir, 'def.schema.yaml'), 'title: Def');

      const index = generator.generate();

      expect(index.domains[0].versions[0].schemas[0].category).toBe(
        'definitions'
      );
    });

    it('should detect profile schemas', () => {
      const commonDir = path.join(srcDir, 'common', '2024-01');
      fs.mkdirSync(commonDir, { recursive: true });
      fs.writeFileSync(
        path.join(commonDir, 'nhs-notify-profile.schema.yaml'),
        'title: Profile'
      );

      const index = generator.generate();

      expect(index.common).toBeDefined();
      expect(index.common!.versions[0].schemas[0].category).toBe('profile');
    });

    it('should recursively search subdirectories', () => {
      const subDir = path.join(
        srcDir,
        'test-domain',
        '2024-01',
        'events',
        'subdir'
      );
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(
        path.join(subDir, 'nested.schema.yaml'),
        'title: Nested'
      );

      const index = generator.generate();

      expect(index.domains[0].versions[0].schemas).toHaveLength(1);
      expect(index.domains[0].versions[0].schemas[0].source).toContain(
        'subdir'
      );
    });
  });

  describe('generate() - example events', () => {
    it('should find example event JSON files', () => {
      const domainDir = path.join(srcDir, 'test-domain', '2024-01');
      fs.mkdirSync(domainDir, { recursive: true });

      const exampleEventsDir = path.join(
        docsDir,
        'test-domain',
        '2024-01',
        'example-events'
      );
      fs.mkdirSync(exampleEventsDir, { recursive: true });
      fs.writeFileSync(
        path.join(exampleEventsDir, 'test-event.json'),
        '{}'
      );

      const index = generator.generate();

      expect(index.domains[0].versions[0].exampleEvents).toHaveLength(1);
      expect(index.domains[0].versions[0].exampleEvents[0].filename).toBe(
        'test-event'
      );
    });

    it('should only include files ending with -event.json', () => {
      const domainDir = path.join(srcDir, 'test-domain', '2024-01');
      fs.mkdirSync(domainDir, { recursive: true });

      const exampleEventsDir = path.join(
        docsDir,
        'test-domain',
        '2024-01',
        'example-events'
      );
      fs.mkdirSync(exampleEventsDir, { recursive: true });
      // Both files end with -event.json, so both will be found
      fs.writeFileSync(
        path.join(exampleEventsDir, 'valid-event.json'),
        '{}'
      );
      fs.writeFileSync(
        path.join(exampleEventsDir, 'another-event.json'),
        '{}'
      );
      // This one should NOT be included (doesn't end with -event.json)
      fs.writeFileSync(
        path.join(exampleEventsDir, 'readme.md'),
        '# Readme'
      );

      const index = generator.generate();

      expect(index.domains[0].versions[0].exampleEvents).toHaveLength(2);
      expect(
        index.domains[0].versions[0].exampleEvents.every((e) =>
          e.filename.endsWith('-event')
        )
      ).toBe(true);
    });

    it('should handle missing example-events directory', () => {
      const domainDir = path.join(srcDir, 'test-domain', '2024-01');
      fs.mkdirSync(domainDir, { recursive: true });

      const index = generator.generate();

      expect(index.domains[0].versions[0].exampleEvents).toEqual([]);
    });
  });

  describe('generate() - generated variants', () => {
    it('should detect bundled schema variants', () => {
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
        path.join(schemasEventsDir, 'test-event.bundle.schema.json'),
        '{}'
      );

      const index = generator.generate();

      expect(index.domains[0].versions[0].schemas).toHaveLength(2);
      expect(
        index.domains[0].versions[0].schemas.some((s) =>
          s.type.includes('Bundled')
        )
      ).toBe(true);
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

      const index = generator.generate();

      expect(index.domains[0].versions[0].schemas).toHaveLength(2);
      expect(
        index.domains[0].versions[0].schemas.some((s) =>
          s.type.includes('Flattened')
        )
      ).toBe(true);
    });
  });

  describe('generate() - metadata handling', () => {
    it('should apply domain purpose from metadata', () => {
      const metadataFile = path.join(testDir, 'readme-metadata.yaml');
      fs.writeFileSync(
        metadataFile,
        yaml.dump({
          domains: {
            'test-domain': { purpose: 'Custom domain purpose' },
          },
        })
      );

      const gen = new ReadmeIndexGenerator({ rootDir: testDir });

      const domainDir = path.join(srcDir, 'test-domain', '2024-01');
      fs.mkdirSync(domainDir, { recursive: true });

      const index = gen.generate();

      expect(index.domains[0].purpose).toBe('Custom domain purpose');
    });

    it('should apply schema label overrides from metadata', () => {
      const metadataFile = path.join(testDir, 'readme-metadata.yaml');
      fs.writeFileSync(
        metadataFile,
        yaml.dump({
          schema_labels: {
            'test-event': 'Overridden Event Label',
          },
        })
      );

      const gen = new ReadmeIndexGenerator({ rootDir: testDir });

      const eventsDir = path.join(srcDir, 'test-domain', '2024-01', 'events');
      fs.mkdirSync(eventsDir, { recursive: true });
      fs.writeFileSync(
        path.join(eventsDir, 'test-event.schema.yaml'),
        'title: Test'
      );

      const index = gen.generate();

      expect(index.domains[0].versions[0].schemas[0].type).toBe(
        'Overridden Event Label'
      );
    });

    it('should apply event label overrides from metadata', () => {
      const metadataFile = path.join(testDir, 'readme-metadata.yaml');
      fs.writeFileSync(
        metadataFile,
        yaml.dump({
          event_labels: {
            'test-event': 'Custom Event Name',
          },
        })
      );

      const gen = new ReadmeIndexGenerator({ rootDir: testDir });

      const domainDir = path.join(srcDir, 'test-domain', '2024-01');
      fs.mkdirSync(domainDir, { recursive: true });

      const exampleEventsDir = path.join(
        docsDir,
        'test-domain',
        '2024-01',
        'example-events'
      );
      fs.mkdirSync(exampleEventsDir, { recursive: true });
      fs.writeFileSync(
        path.join(exampleEventsDir, 'test-event.json'),
        '{}'
      );

      const index = gen.generate();

      expect(index.domains[0].versions[0].exampleEvents[0].name).toBe(
        'Custom Event Name'
      );
    });
  });

  describe('generate() - common schemas', () => {
    it('should process common schemas', () => {
      const commonDir = path.join(srcDir, 'common', '2024-01');
      fs.mkdirSync(commonDir, { recursive: true });
      fs.writeFileSync(
        path.join(commonDir, 'nhs-notify-profile.schema.yaml'),
        'title: Profile'
      );

      const index = generator.generate();

      expect(index.common).toBeDefined();
      expect(index.common!.versions).toHaveLength(1);
      expect(index.common!.versions[0].schemas).toHaveLength(1);
    });

    it('should include default common purposes', () => {
      const commonDir = path.join(srcDir, 'common', '2024-01');
      fs.mkdirSync(commonDir, { recursive: true });
      fs.writeFileSync(
        path.join(commonDir, 'nhs-notify-profile.schema.yaml'),
        'title: Profile'
      );

      const index = generator.generate();

      expect(index.common).toBeDefined();
      expect(index.common).not.toBeNull();
      expect(index.common!.purposes).toBeDefined();
      // The purposes object should have at least one entry
      const purposeKeys = Object.keys(index.common!.purposes);
      expect(purposeKeys.length).toBeGreaterThan(0);
    });

    it('should handle bundled and flattened common schemas', () => {
      const commonDir = path.join(srcDir, 'common', '2024-01');
      fs.mkdirSync(commonDir, { recursive: true });
      fs.writeFileSync(
        path.join(commonDir, 'nhs-notify-profile.schema.yaml'),
        'title: Profile'
      );

      const commonSchemasDir = path.join(schemasDir, 'common', '2024-01');
      fs.mkdirSync(commonSchemasDir, { recursive: true });
      fs.writeFileSync(
        path.join(commonSchemasDir, 'nhs-notify-profile.bundle.schema.json'),
        '{}'
      );
      fs.writeFileSync(
        path.join(
          commonSchemasDir,
          'nhs-notify-profile.flattened.schema.json'
        ),
        '{}'
      );

      const index = generator.generate();

      expect(index.common!.versions[0].schemas).toHaveLength(3); // Original + bundled + flattened
    });
  });

  describe('generate() - index structure', () => {
    it('should include generation timestamp', () => {
      const domainDir = path.join(srcDir, 'test-domain', '2024-01');
      fs.mkdirSync(domainDir, { recursive: true });

      const index = generator.generate();

      expect(index.generated).toBeDefined();
      expect(new Date(index.generated)).toBeInstanceOf(Date);
    });

    it('should include domains array', () => {
      const index = generator.generate();

      expect(index.domains).toBeDefined();
      expect(Array.isArray(index.domains)).toBe(true);
    });

    it('should return null for common if no common schemas exist', () => {
      const index = generator.generate();

      expect(index.common).toBeNull();
    });
  });

  describe('generateToFile()', () => {
    it('should write YAML file with header', () => {
      const domainDir = path.join(srcDir, 'test-domain', '2024-01');
      fs.mkdirSync(domainDir, { recursive: true });

      generator.generateToFile();

      const outputFile = generator.getOutputFile();
      expect(fs.existsSync(outputFile)).toBe(true);

      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('# AUTO-GENERATED FILE - DO NOT EDIT');
      expect(content).toContain('generated:');
    });

    it('should write valid YAML', () => {
      const domainDir = path.join(srcDir, 'test-domain', '2024-01');
      fs.mkdirSync(domainDir, { recursive: true });

      generator.generateToFile();

      const outputFile = generator.getOutputFile();
      const content = fs.readFileSync(outputFile, 'utf8');

      // Should be able to parse the YAML
      expect(() => yaml.load(content)).not.toThrow();
    });

    it('should return the generated index', () => {
      const domainDir = path.join(srcDir, 'test-domain', '2024-01');
      fs.mkdirSync(domainDir, { recursive: true });

      const index = generator.generateToFile();

      expect(index).toBeDefined();
      expect(index.generated).toBeDefined();
      expect(index.domains).toBeDefined();
    });
  });

  describe('verbose logging', () => {
    it('should log when verbose is enabled', () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = jest.fn((...args: any[]) => {
        logs.push(args.join(' '));
      });

      try {
        const verboseGen = new ReadmeIndexGenerator({
          rootDir: testDir,
          verbose: true,
        });

        const domainDir = path.join(srcDir, 'test-domain', '2024-01');
        fs.mkdirSync(domainDir, { recursive: true });

        verboseGen.generate();

        expect(logs.length).toBeGreaterThan(0);
        expect(logs.some((log) => log.includes('Scanning'))).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });

    it('should not log when verbose is disabled', () => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = jest.fn((...args: any[]) => {
        logs.push(args.join(' '));
      });

      try {
        const domainDir = path.join(srcDir, 'test-domain', '2024-01');
        fs.mkdirSync(domainDir, { recursive: true });

        generator.generate();

        expect(logs.length).toBe(0);
      } finally {
        console.log = originalLog;
      }
    });
  });
});
