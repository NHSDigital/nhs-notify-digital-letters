import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SchemaBundler } from '../manual-bundler/schema-bundler.ts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SchemaBundler', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-bundler-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const bundler = new SchemaBundler();
      expect(bundler).toBeInstanceOf(SchemaBundler);
    });

    it('should create instance with custom options', () => {
      const bundler = new SchemaBundler({ flatten: true, verbose: false });
      expect(bundler).toBeInstanceOf(SchemaBundler);
    });
  });

  describe('bundleToFile', () => {
    it('should write bundled schema to file', async () => {
      const schema = { type: 'object', properties: { name: { type: 'string' } } };
      const entry = path.join(tempDir, 'entry.json');
      const output = path.join(tempDir, 'output.json');
      fs.writeFileSync(entry, JSON.stringify(schema));

      const bundler = new SchemaBundler({ verbose: false });
      const success = await bundler.bundleToFile(entry, output);

      expect(success).toBe(true);
      expect(fs.existsSync(output)).toBe(true);
    });

    it('should create output directory', async () => {
      const schema = { type: 'object' };
      const entry = path.join(tempDir, 'entry.json');
      const output = path.join(tempDir, 'nested', 'output.json');
      fs.writeFileSync(entry, JSON.stringify(schema));

      const bundler = new SchemaBundler({ verbose: false });
      await bundler.bundleToFile(entry, output);

      expect(fs.existsSync(output)).toBe(true);
    });

    it('should add metadata fields to output', async () => {
      const schema = { type: 'object' };
      const entry = path.join(tempDir, 'entry.json');
      const output = path.join(tempDir, 'output.json');
      fs.writeFileSync(entry, JSON.stringify(schema));

      const bundler = new SchemaBundler({ verbose: false });
      await bundler.bundleToFile(entry, output);

      const result = JSON.parse(fs.readFileSync(output, 'utf-8'));
      expect(result.$id).toBeDefined();
      expect(result.$comment).toContain('Bundled');
    });

    it('should indicate flatten mode in comment', async () => {
      const schema = { type: 'object' };
      const entry = path.join(tempDir, 'entry.json');
      const output = path.join(tempDir, 'output.json');
      fs.writeFileSync(entry, JSON.stringify(schema));

      const bundler = new SchemaBundler({ flatten: true, verbose: false });
      await bundler.bundleToFile(entry, output);

      const result = JSON.parse(fs.readFileSync(output, 'utf-8'));
      expect(result.$comment).toContain('Flattened');
    });
  });

  describe('bundle', () => {
    it('should dereference local file refs', async () => {
      const ref = { type: 'object', properties: { name: { type: 'string' } } };
      const entry = { type: 'object', properties: { user: { $ref: './ref.json' } } };
      fs.writeFileSync(path.join(tempDir, 'ref.json'), JSON.stringify(ref));
      fs.writeFileSync(path.join(tempDir, 'entry.json'), JSON.stringify(entry));

      const bundler = new SchemaBundler({ verbose: false });
      const output = path.join(tempDir, 'out.json');
      const result = await bundler.bundle(path.join(tempDir, 'entry.json'), output);

      expect(result.success).toBe(true);
      expect(result.schema.properties.user).toBeDefined();
    });

    it('should preserve external refs', async () => {
      const entry = { type: 'object', properties: { ext: { $ref: 'https://example.com/schema.json' } } };
      fs.writeFileSync(path.join(tempDir, 'entry.json'), JSON.stringify(entry));

      const bundler = new SchemaBundler({ verbose: false });
      const output = path.join(tempDir, 'out.json');
      const result = await bundler.bundle(path.join(tempDir, 'entry.json'), output);

      expect(result.success).toBe(true);
      expect(result.schema.properties.ext.$ref).toBe('https://example.com/schema.json');
    });

    it('should handle YAML files', async () => {
      fs.writeFileSync(path.join(tempDir, 'entry.yaml'), 'type: object\nproperties:\n  name:\n    type: string');

      const bundler = new SchemaBundler({ verbose: false });
      const output = path.join(tempDir, 'out.json');
      const result = await bundler.bundle(path.join(tempDir, 'entry.yaml'), output);

      expect(result.success).toBe(true);
      expect(result.schema.type).toBe('object');
    });

    it('should preserve allOf in bundle mode', async () => {
      const base = { type: 'object', properties: { id: { type: 'string' } } };
      const entry = { type: 'object', allOf: [{ $ref: './base.json' }] };
      fs.writeFileSync(path.join(tempDir, 'base.json'), JSON.stringify(base));
      fs.writeFileSync(path.join(tempDir, 'entry.json'), JSON.stringify(entry));

      const bundler = new SchemaBundler({ flatten: false, verbose: false });
      const output = path.join(tempDir, 'out.json');
      const result = await bundler.bundle(path.join(tempDir, 'entry.json'), output);

      expect(result.success).toBe(true);
      expect(result.schema.allOf).toBeDefined();
    });

    it('should flatten allOf in flatten mode', async () => {
      const base = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] };
      const ext = { type: 'object', allOf: [{ $ref: './base.json' }], properties: { name: { type: 'string' } }, required: ['name'] };
      fs.writeFileSync(path.join(tempDir, 'base.json'), JSON.stringify(base));
      fs.writeFileSync(path.join(tempDir, 'ext.json'), JSON.stringify(ext));

      const bundler = new SchemaBundler({ flatten: true, verbose: false });
      const output = path.join(tempDir, 'out.json');
      const result = await bundler.bundle(path.join(tempDir, 'ext.json'), output);

      expect(result.success).toBe(true);
      expect(result.schema.properties.id).toBeDefined();
      expect(result.schema.properties.name).toBeDefined();
    });

    it('should merge required arrays', async () => {
      const s1 = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] };
      const s2 = { type: 'object', properties: { b: { type: 'string' } }, required: ['b'] };
      const entry = { type: 'object', allOf: [{ $ref: './s1.json' }, { $ref: './s2.json' }] };
      fs.writeFileSync(path.join(tempDir, 's1.json'), JSON.stringify(s1));
      fs.writeFileSync(path.join(tempDir, 's2.json'), JSON.stringify(s2));
      fs.writeFileSync(path.join(tempDir, 'entry.json'), JSON.stringify(entry));

      const bundler = new SchemaBundler({ flatten: true, verbose: false });
      const output = path.join(tempDir, 'out.json');
      const result = await bundler.bundle(path.join(tempDir, 'entry.json'), output);

      expect(result.success).toBe(true);
      expect(result.schema.required).toContain('a');
      expect(result.schema.required).toContain('b');
    });
  });

  describe('error handling', () => {
    it('should return error for missing file', async () => {
      const bundler = new SchemaBundler({ verbose: false });
      const output = path.join(tempDir, 'out.json');
      const result = await bundler.bundle(path.join(tempDir, 'missing.json'), output);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle invalid JSON', async () => {
      fs.writeFileSync(path.join(tempDir, 'bad.json'), '{ bad json }');

      const bundler = new SchemaBundler({ verbose: false });
      const output = path.join(tempDir, 'out.json');
      const result = await bundler.bundle(path.join(tempDir, 'bad.json'), output);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return false from bundleToFile on error', async () => {
      const bundler = new SchemaBundler({ verbose: false });
      const output = path.join(tempDir, 'out.json');
      const success = await bundler.bundleToFile(path.join(tempDir, 'missing.json'), output);

      expect(success).toBe(false);
    });
  });
});
