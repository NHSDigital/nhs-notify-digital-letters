/**
 * Unit tests for ReadmeRenderer class
 *
 * Tests the class methods for rendering markdown from YAML index.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { ReadmeRenderer } from '../readme-generator/readme-renderer.ts';
import type { IndexStructure } from '../readme-generator/readme-index-generator.ts';

describe('ReadmeRenderer', () => {
  let testDir: string;
  let indexFile: string;
  let readmeFile: string;
  let renderer: ReadmeRenderer;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-renderer-test-'));

    indexFile = path.join(testDir, 'readme-index.yaml');
    readmeFile = path.join(testDir, 'README.md');

    renderer = new ReadmeRenderer({
      rootDir: testDir,
      readmeFile: readmeFile, // Explicitly set readmeFile in test dir
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
      // Create a separate renderer without overriding readmeFile
      const defaultRenderer = new ReadmeRenderer({
        rootDir: testDir,
        verbose: false,
      });

      expect(defaultRenderer.getIndexFile()).toBe(
        path.join(testDir, 'readme-index.yaml')
      );
      // Default readme path is two levels up
      expect(defaultRenderer.getReadmeFile()).toBe(
        path.join(testDir, '..', '..', 'README.md')
      );
    });

    it('should accept custom paths', () => {
      const customRenderer = new ReadmeRenderer({
        rootDir: testDir,
        indexFile: path.join(testDir, 'custom-index.yaml'),
        readmeFile: path.join(testDir, 'CUSTOM_README.md'),
      });

      expect(customRenderer.getIndexFile()).toBe(
        path.join(testDir, 'custom-index.yaml')
      );
      expect(customRenderer.getReadmeFile()).toBe(
        path.join(testDir, 'CUSTOM_README.md')
      );
    });

    it('should expose marker values', () => {
      const markers = renderer.getMarkers();
      expect(markers.start).toBe('<!-- AUTO-GENERATED-CONTENT:START -->');
      expect(markers.end).toBe('<!-- AUTO-GENERATED-CONTENT:END -->');
    });
  });

  describe('loadIndex()', () => {
    it('should load valid YAML index', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: null,
        domains: [],
      };

      fs.writeFileSync(indexFile, yaml.dump(index));

      const loaded = renderer.loadIndex();
      expect(loaded.generated).toBeDefined();
      expect(loaded.domains).toEqual([]);
    });

    it('should throw error if index file does not exist', () => {
      expect(() => renderer.loadIndex()).toThrow(
        'Index file not found'
      );
    });

    it('should parse complex index structure', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: {
          versions: [
            {
              version: '2024-01',
              schemas: [],
              exampleEvents: [],
            },
          ],
          purposes: {
            'NHS Notify Profile': 'Profile purpose',
          },
        },
        domains: [
          {
            name: 'test-domain',
            displayName: 'Test Domain',
            purpose: 'Test purpose',
            versions: [],
          },
        ],
      };

      fs.writeFileSync(indexFile, yaml.dump(index));

      const loaded = renderer.loadIndex();
      expect(loaded.common).toBeDefined();
      expect(loaded.domains).toHaveLength(1);
    });
  });

  describe('generateContent() - common schemas', () => {
    it('should render common schemas section with schemas', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: {
          versions: [
            {
              version: '2024-01',
              schemas: [
                {
                  type: 'NHS Notify Profile',
                  category: 'profile',
                  source: 'src/common/2024-01/profile.yaml',
                  published: 'schemas/common/2024-01/profile.json',
                  docs: 'docs/common/2024-01/profile.md',
                },
              ],
              exampleEvents: [],
            },
          ],
          purposes: {
            'NHS Notify Profile': 'Base profile',
          },
        },
        domains: [],
      };

      const content = renderer.generateContent(index);

      expect(content).toContain('## Common Schemas');
      expect(content).toContain('### Version: 2024-01');
      expect(content).toContain('NHS Notify Profile');
      expect(content).toContain('**Purpose:**');
      expect(content).toContain('Base profile');
    });

    it('should render empty message when no common schemas exist', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: null,
        domains: [],
      };

      const content = renderer.generateContent(index);

      expect(content).toContain('## Common Schemas');
      expect(content).toContain('_No common schemas defined yet._');
    });

    it('should render example events in common schemas', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: {
          versions: [
            {
              version: '2024-01',
              schemas: [],
              exampleEvents: [
                {
                  name: 'Profile Example',
                  filename: 'profile-example-event',
                  json: 'docs/common/2024-01/example.json',
                  markdown: 'docs/common/2024-01/example.md',
                },
              ],
            },
          ],
          purposes: {},
        },
        domains: [],
      };

      const content = renderer.generateContent(index);

      expect(content).toContain('#### Example Events');
      expect(content).toContain('Profile Example');
      expect(content).toContain('example.json');
    });

    it('should format source links correctly', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: {
          versions: [
            {
              version: '2024-01',
              schemas: [
                {
                  type: 'Test Schema',
                  category: 'profile',
                  source: 'src/common/2024-01/test.yaml',
                  published: 'schemas/test.json',
                  docs: 'docs/test.md',
                },
              ],
              exampleEvents: [],
            },
          ],
          purposes: {},
        },
        domains: [],
      };

      const content = renderer.generateContent(index);

      expect(content).toContain('[`src/common/2024-01/test.yaml`]');
      expect(content).toContain('(src/common/2024-01/test.yaml)');
    });

    it('should handle _Generated_ source marker', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: {
          versions: [
            {
              version: '2024-01',
              schemas: [
                {
                  type: 'Generated Schema',
                  category: 'profile',
                  source: '_Generated_',
                  published: 'schemas/generated.json',
                  docs: 'docs/generated.md',
                },
              ],
              exampleEvents: [],
            },
          ],
          purposes: {},
        },
        domains: [],
      };

      const content = renderer.generateContent(index);

      expect(content).toContain('_Generated_');
      expect(content).not.toContain('[`_Generated_`]');
    });
  });

  describe('generateContent() - domains', () => {
    it('should render domain section with schemas', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: null,
        domains: [
          {
            name: 'digital-letters',
            displayName: 'Digital Letters',
            purpose: 'Digital letters domain',
            versions: [
              {
                version: '2024-01',
                schemas: [
                  {
                    type: 'Letter Event',
                    category: 'events',
                    source: 'src/digital-letters/2024-01/events/letter.yaml',
                    published: 'schemas/digital-letters/2024-01/letter.json',
                    docs: 'docs/digital-letters/2024-01/letter.md',
                  },
                ],
                exampleEvents: [],
              },
            ],
          },
        ],
      };

      const content = renderer.generateContent(index);

      expect(content).toContain('## Digital Letters Domain');
      expect(content).toContain('**Purpose:** Digital letters domain');
      expect(content).toContain('### Version: 2024-01');
      expect(content).toContain('Letter Event');
    });

    it('should render multiple domains', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: null,
        domains: [
          {
            name: 'domain1',
            displayName: 'Domain 1',
            purpose: 'Purpose 1',
            versions: [
              {
                version: '2024-01',
                schemas: [],
                exampleEvents: [],
              },
            ],
          },
          {
            name: 'domain2',
            displayName: 'Domain 2',
            purpose: 'Purpose 2',
            versions: [
              {
                version: '2024-01',
                schemas: [],
                exampleEvents: [],
              },
            ],
          },
        ],
      };

      const content = renderer.generateContent(index);

      expect(content).toContain('## Domain 1 Domain');
      expect(content).toContain('## Domain 2 Domain');
    });

    it('should render multiple versions per domain', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: null,
        domains: [
          {
            name: 'test-domain',
            displayName: 'Test Domain',
            purpose: 'Test',
            versions: [
              {
                version: '2024-01',
                schemas: [],
                exampleEvents: [],
              },
              {
                version: '2024-02',
                schemas: [],
                exampleEvents: [],
              },
            ],
          },
        ],
      };

      const content = renderer.generateContent(index);

      expect(content).toContain('### Version: 2024-01');
      expect(content).toContain('### Version: 2024-02');
    });

    it('should render example events for domains', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: null,
        domains: [
          {
            name: 'test-domain',
            displayName: 'Test Domain',
            purpose: 'Test',
            versions: [
              {
                version: '2024-01',
                schemas: [],
                exampleEvents: [
                  {
                    name: 'Test Event',
                    filename: 'test-event',
                    json: 'docs/test-event.json',
                    markdown: 'docs/test-event.md',
                  },
                ],
              },
            ],
          },
        ],
      };

      const content = renderer.generateContent(index);

      expect(content).toContain('#### Example Events');
      expect(content).toContain('Test Event');
    });

    it('should handle empty example events array', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: null,
        domains: [
          {
            name: 'test-domain',
            displayName: 'Test Domain',
            purpose: 'Test',
            versions: [
              {
                version: '2024-01',
                schemas: [],
                exampleEvents: [],
              },
            ],
          },
        ],
      };

      const content = renderer.generateContent(index);

      expect(content).not.toContain('#### Example Events');
    });
  });

  describe('generateContent() - table formatting', () => {
    it('should create properly formatted markdown tables', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: {
          versions: [
            {
              version: '2024-01',
              schemas: [
                {
                  type: 'Schema',
                  category: 'profile',
                  source: 'src/schema.yaml',
                  published: 'schemas/schema.json',
                  docs: 'docs/schema.md',
                },
              ],
              exampleEvents: [],
            },
          ],
          purposes: {},
        },
        domains: [],
      };

      const content = renderer.generateContent(index);

      // Check for table structure
      expect(content).toMatch(/\| Schema \|/);
      expect(content).toMatch(/\| -+ \| -+ \| -+ \| -+ \|/);
    });

    it('should format links in tables correctly', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: null,
        domains: [
          {
            name: 'test',
            displayName: 'Test',
            purpose: 'Test',
            versions: [
              {
                version: '2024-01',
                schemas: [
                  {
                    type: 'Event',
                    category: 'events',
                    source: 'src/event.yaml',
                    published: 'schemas/event.json',
                    docs: 'docs/event.md',
                  },
                ],
                exampleEvents: [],
              },
            ],
          },
        ],
      };

      const content = renderer.generateContent(index);

      expect(content).toContain('[`src/event.yaml`](src/event.yaml)');
      expect(content).toContain('[`schemas/event.json`](schemas/event.json)');
      expect(content).toContain('[`docs/event.md`](docs/event.md)');
    });
  });

  describe('updateReadme()', () => {
    it('should update README between markers', () => {
      const readmeContent = `# Test README

Before content

<!-- AUTO-GENERATED-CONTENT:START -->
Old content
<!-- AUTO-GENERATED-CONTENT:END -->

After content
`;
      fs.writeFileSync(readmeFile, readmeContent);

      renderer.updateReadme('New generated content');

      const updated = fs.readFileSync(readmeFile, 'utf8');

      expect(updated).toContain('Before content');
      expect(updated).toContain('New generated content');
      expect(updated).toContain('After content');
      expect(updated).not.toContain('Old content');
    });

    it('should throw error if README does not exist', () => {
      expect(() => renderer.updateReadme('content')).toThrow(
        'README.md not found'
      );
    });

    it('should throw error if START marker is missing', () => {
      fs.writeFileSync(readmeFile, '# README\n\nNo markers here');

      expect(() => renderer.updateReadme('content')).toThrow(
        'must contain both markers'
      );
    });

    it('should throw error if END marker is missing', () => {
      fs.writeFileSync(
        readmeFile,
        '# README\n\n<!-- AUTO-GENERATED-CONTENT:START -->'
      );

      expect(() => renderer.updateReadme('content')).toThrow(
        'must contain both markers'
      );
    });

    it('should preserve content before START marker', () => {
      const beforeContent = '# My README\n\nIntro paragraph\n\n';
      fs.writeFileSync(
        readmeFile,
        beforeContent +
          '<!-- AUTO-GENERATED-CONTENT:START -->\nOld\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      renderer.updateReadme('New content');

      const updated = fs.readFileSync(readmeFile, 'utf8');
      expect(updated.startsWith(beforeContent)).toBe(true);
    });

    it('should preserve content after END marker', () => {
      const afterContent = '\n\n## Footer\n\nFooter text\n';
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\nOld\n<!-- AUTO-GENERATED-CONTENT:END -->' +
          afterContent
      );

      renderer.updateReadme('New content');

      const updated = fs.readFileSync(readmeFile, 'utf8');
      expect(updated.endsWith(afterContent)).toBe(true);
    });
  });

  describe('render() - full workflow', () => {
    it('should load index and update README', () => {
      const index: IndexStructure = {
        generated: new Date().toISOString(),
        common: null,
        domains: [
          {
            name: 'test',
            displayName: 'Test',
            purpose: 'Test purpose',
            versions: [
              {
                version: '2024-01',
                schemas: [],
                exampleEvents: [],
              },
            ],
          },
        ],
      };

      fs.writeFileSync(indexFile, yaml.dump(index));
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->'
      );

      renderer.render();

      const updated = fs.readFileSync(readmeFile, 'utf8');
      expect(updated).toContain('## Test Domain');
      expect(updated).toContain('**Purpose:** Test purpose');
    });

    it('should throw if index file is missing', () => {
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->'
      );

      expect(() => renderer.render()).toThrow('Index file not found');
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
        const verboseRenderer = new ReadmeRenderer({
          rootDir: testDir,
          readmeFile: readmeFile,
          verbose: true,
        });

        const index: IndexStructure = {
          generated: new Date().toISOString(),
          common: null,
          domains: [],
        };

        fs.writeFileSync(indexFile, yaml.dump(index));
        fs.writeFileSync(
          readmeFile,
          '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->'
        );

        verboseRenderer.render();

        expect(logs.length).toBeGreaterThan(0);
        expect(logs.some((log) => log.includes('Rendering'))).toBe(true);
        expect(logs.some((log) => log.includes('Done'))).toBe(true);
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
        const index: IndexStructure = {
          generated: new Date().toISOString(),
          common: null,
          domains: [],
        };

        fs.writeFileSync(indexFile, yaml.dump(index));
        fs.writeFileSync(
          readmeFile,
          '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->'
        );

        renderer.render();

        // Should not log anything
        expect(logs.length).toBe(0);
      } finally {
        console.log = originalLog;
      }
    });
  });
});
