import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handleCli } from '../manual-bundler/manual-bundle-schema-cli.ts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('handleCli', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return error for missing arguments', async () => {
    const result = await handleCli([]);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain('Missing required arguments');
  });

  it('should return error for missing output file', async () => {
    const result = await handleCli(['input.json']);
    expect(result.exitCode).toBe(1);
    expect(result.error).toContain('Missing required arguments');
  });

  it('should handle --flatten flag', async () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    const entry = path.join(tempDir, 'entry.json');
    const output = path.join(tempDir, 'output.json');
    fs.writeFileSync(entry, JSON.stringify(schema));

    const result = await handleCli(['--flatten', entry, output]);
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(output)).toBe(true);

    const out = JSON.parse(fs.readFileSync(output, 'utf-8'));
    expect(out.$comment).toContain('Flattened');
  });

  it('should handle --root-dir and --base-url', async () => {
    const schema = { type: 'object' };
    const entry = path.join(tempDir, 'entry.json');
    const output = path.join(tempDir, 'output.json');
    fs.writeFileSync(entry, JSON.stringify(schema));

    const result = await handleCli(['--root-dir', tempDir, '--base-url', 'https://example.com', entry, output]);
    expect(result.exitCode).toBe(0);
  });

  it('should process schema without flags', async () => {
    const schema = { type: 'object' };
    const entry = path.join(tempDir, 'entry.json');
    const output = path.join(tempDir, 'output.json');
    fs.writeFileSync(entry, JSON.stringify(schema));

    const result = await handleCli([entry, output]);
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(output)).toBe(true);
  });

  it('should return error for non-existent input file', async () => {
    const result = await handleCli([path.join(tempDir, 'missing.json'), path.join(tempDir, 'out.json')]);
    expect(result.exitCode).toBe(1);
  });

  it('should clear cache with --clear-cache', async () => {
    const result = await handleCli(['--clear-cache']);
    expect(result.exitCode).toBe(0);
  });

  it('should display cache info with --cache-info', async () => {
    const result = await handleCli(['--cache-info']);
    expect(result.exitCode).toBe(0);
  });
});
