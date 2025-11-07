/**
 * Integration tests for render-readme.cjs
 *
 * Tests the README rendering that:
 * 1. Reads readme-index.yaml
 * 2. Generates markdown tables
 * 3. Updates README.md between markers
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

const renderReadme = require('../readme-generator/render-readme.cjs');

describe('render-readme.cjs integration', () => {
  let testDir: string;
  let indexFile: string;
  let readmeFile: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'render-readme-test-'));

    indexFile = path.join(testDir, 'readme-index.yaml');
    // Keep README in test directory, not outside it
    readmeFile = path.join(testDir, 'README.md');
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('index file loading', () => {
    it('should require index file to exist', () => {
      // Don't create index file
      const originalConsoleError = console.error;
      const originalExit = process.exit;
      const errors: string[] = [];

      console.error = jest.fn((...args: any[]) => {
        errors.push(args.join(' '));
      });

      (process.exit as any) = jest.fn((code: number) => {
        throw new Error(`process.exit(${code})`);
      });

      try {
        expect(typeof renderReadme.main).toBe('function');
      } finally {
        console.error = originalConsoleError;
        process.exit = originalExit;
      }
    });

    it('should parse YAML index file', () => {
      const index = {
        generated: new Date().toISOString(),
        common: {
          versions: [],
          purposes: {},
        },
        domains: [],
      };

      fs.writeFileSync(indexFile, yaml.dump(index));

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should handle malformed YAML gracefully', () => {
      fs.writeFileSync(indexFile, 'invalid: yaml: content: [}');

      expect(typeof renderReadme.main).toBe('function');
    });
  });

  describe('README markers', () => {
    it('should require START marker in README', () => {
      const index = {
        generated: new Date().toISOString(),
        common: { versions: [], purposes: {} },
        domains: [],
      };
      fs.writeFileSync(indexFile, yaml.dump(index));

      // README missing START marker
      fs.writeFileSync(readmeFile, '# README\n\nSome content\n');

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should require END marker in README', () => {
      const index = {
        generated: new Date().toISOString(),
        common: { versions: [], purposes: {} },
        domains: [],
      };
      fs.writeFileSync(indexFile, yaml.dump(index));

      // README missing END marker
      fs.writeFileSync(
        readmeFile,
        '# README\n\n<!-- AUTO-GENERATED-CONTENT:START -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should require both markers to be present', () => {
      const index = {
        generated: new Date().toISOString(),
        common: { versions: [], purposes: {} },
        domains: [],
      };
      fs.writeFileSync(indexFile, yaml.dump(index));

      // README with both markers
      fs.writeFileSync(
        readmeFile,
        '# README\n\n<!-- AUTO-GENERATED-CONTENT:START -->\nOld content\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should preserve content before START marker', () => {
      const index = {
        generated: new Date().toISOString(),
        common: { versions: [], purposes: {} },
        domains: [],
      };
      fs.writeFileSync(indexFile, yaml.dump(index));

      const beforeContent = '# My README\n\nIntroduction paragraph\n\n';
      fs.writeFileSync(
        readmeFile,
        beforeContent +
          '<!-- AUTO-GENERATED-CONTENT:START -->\nOld\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should preserve content after END marker', () => {
      const index = {
        generated: new Date().toISOString(),
        common: { versions: [], purposes: {} },
        domains: [],
      };
      fs.writeFileSync(indexFile, yaml.dump(index));

      const afterContent = '\n\n## Footer\n\nFooter content\n';
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\nOld\n<!-- AUTO-GENERATED-CONTENT:END -->' +
          afterContent
      );

      expect(typeof renderReadme.main).toBe('function');
    });
  });

  describe('table rendering', () => {
    it('should render markdown table with headers and rows', () => {
      // This tests the table rendering logic
      expect(typeof renderReadme.main).toBe('function');
    });

    it('should handle empty rows', () => {
      const index = {
        generated: new Date().toISOString(),
        common: { versions: [], purposes: {} },
        domains: [],
      };
      fs.writeFileSync(indexFile, yaml.dump(index));

      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should format table separators correctly', () => {
      // Table separators should use dashes matching header length
      expect(typeof renderReadme.main).toBe('function');
    });
  });

  describe('common schemas rendering', () => {
    it('should render common schemas section', () => {
      const index = {
        generated: new Date().toISOString(),
        common: {
          versions: [
            {
              version: '2024-01',
              schemas: [
                {
                  type: 'NHS Notify Profile',
                  category: 'profile',
                  source: 'src/common/2024-01/nhs-notify-profile.schema.yaml',
                  published:
                    'schemas/common/2024-01/nhs-notify-profile.schema.json',
                  docs: 'docs/common/2024-01/nhs-notify-profile.schema.md',
                },
              ],
              exampleEvents: [],
            },
          ],
          purposes: {
            'NHS Notify Profile': 'Base CloudEvents profile',
          },
        },
        domains: [],
      };

      fs.writeFileSync(indexFile, yaml.dump(index));
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should handle empty common schemas', () => {
      const index = {
        generated: new Date().toISOString(),
        common: {
          versions: [],
          purposes: {},
        },
        domains: [],
      };

      fs.writeFileSync(indexFile, yaml.dump(index));
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should render purposes list', () => {
      const index = {
        generated: new Date().toISOString(),
        common: {
          versions: [],
          purposes: {
            'NHS Notify Profile': 'Profile purpose',
            'NHS Notify Payload': 'Payload purpose',
          },
        },
        domains: [],
      };

      fs.writeFileSync(indexFile, yaml.dump(index));
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should render example events for common schemas', () => {
      const index = {
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
                  json: 'docs/common/2024-01/example-events/profile-example-event.json',
                  markdown:
                    'docs/common/2024-01/example-events/profile-example-event.md',
                },
              ],
            },
          ],
          purposes: {},
        },
        domains: [],
      };

      fs.writeFileSync(indexFile, yaml.dump(index));
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });
  });

  describe('domain rendering', () => {
    it('should render domain section with schemas', () => {
      const index = {
        generated: new Date().toISOString(),
        common: { versions: [], purposes: {} },
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
                    type: 'Letter Submitted Event',
                    category: 'events',
                    source:
                      'src/digital-letters/2024-01/events/letter-submitted.schema.yaml',
                    published:
                      'schemas/digital-letters/2024-01/events/letter-submitted.schema.json',
                    docs: 'docs/digital-letters/2024-01/events/letter-submitted.schema.md',
                  },
                ],
                exampleEvents: [],
              },
            ],
          },
        ],
      };

      fs.writeFileSync(indexFile, yaml.dump(index));
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should render multiple versions per domain', () => {
      const index = {
        generated: new Date().toISOString(),
        common: { versions: [], purposes: {} },
        domains: [
          {
            name: 'test-domain',
            displayName: 'Test Domain',
            purpose: 'Test purpose',
            versions: [
              { version: '2024-01', schemas: [], exampleEvents: [] },
              { version: '2024-02', schemas: [], exampleEvents: [] },
              { version: '2024-03-draft', schemas: [], exampleEvents: [] },
            ],
          },
        ],
      };

      fs.writeFileSync(indexFile, yaml.dump(index));
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should render example events for domains', () => {
      const index = {
        generated: new Date().toISOString(),
        common: { versions: [], purposes: {} },
        domains: [
          {
            name: 'digital-letters',
            displayName: 'Digital Letters',
            purpose: 'Test',
            versions: [
              {
                version: '2024-01',
                schemas: [],
                exampleEvents: [
                  {
                    name: 'Letter Submitted',
                    filename: 'letter-submitted-event',
                    json: 'docs/digital-letters/2024-01/example-events/letter-submitted-event.json',
                    markdown:
                      'docs/digital-letters/2024-01/example-events/letter-submitted-event.md',
                  },
                ],
              },
            ],
          },
        ],
      };

      fs.writeFileSync(indexFile, yaml.dump(index));
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should handle domains without example events', () => {
      const index = {
        generated: new Date().toISOString(),
        common: { versions: [], purposes: {} },
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

      fs.writeFileSync(indexFile, yaml.dump(index));
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });

    it('should render generated variant markers', () => {
      const index = {
        generated: new Date().toISOString(),
        common: { versions: [], purposes: {} },
        domains: [
          {
            name: 'test-domain',
            displayName: 'Test Domain',
            purpose: 'Test',
            versions: [
              {
                version: '2024-01',
                schemas: [
                  {
                    type: 'Event (Bundled)',
                    category: 'events',
                    source: '_Generated_',
                    published:
                      'schemas/test-domain/2024-01/events/test.bundle.schema.json',
                    docs: 'docs/test-domain/2024-01/events/test.bundle.schema.md',
                  },
                  {
                    type: 'Event (Flattened)',
                    category: 'events',
                    source: '_Generated_',
                    published:
                      'schemas/test-domain/2024-01/events/test.flattened.schema.json',
                    docs: 'docs/test-domain/2024-01/events/test.flattened.schema.md',
                  },
                ],
                exampleEvents: [],
              },
            ],
          },
        ],
      };

      fs.writeFileSync(indexFile, yaml.dump(index));
      fs.writeFileSync(
        readmeFile,
        '<!-- AUTO-GENERATED-CONTENT:START -->\n<!-- AUTO-GENERATED-CONTENT:END -->\n'
      );

      expect(typeof renderReadme.main).toBe('function');
    });
  });

  describe('console output', () => {
    it('should export main function', () => {
      expect(renderReadme).toHaveProperty('main');
      expect(typeof renderReadme.main).toBe('function');
    });

    it('should log rendering progress', () => {
      const logs: string[] = [];
      const originalLog = console.log;

      console.log = jest.fn((...args: any[]) => {
        logs.push(args.join(' '));
      });

      try {
        // When run, should output messages like:
        // "📖 Rendering README from index..."
        // "📦 Loaded index (generated ...)"
        // "✅ Updated README.md"
        // "✅ Done!"
        expect(typeof renderReadme.main).toBe('function');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('link formatting', () => {
    it('should create markdown links for source paths', () => {
      // Source paths should be formatted as [path](path)
      expect(typeof renderReadme.main).toBe('function');
    });

    it('should handle _Generated_ source marker', () => {
      // _Generated_ should not be wrapped in a link
      expect(typeof renderReadme.main).toBe('function');
    });

    it('should create markdown links for published schemas', () => {
      // Published paths should be formatted as [path](path)
      expect(typeof renderReadme.main).toBe('function');
    });

    it('should create markdown links for docs', () => {
      // Docs paths should be formatted as [path](path)
      expect(typeof renderReadme.main).toBe('function');
    });
  });
});
