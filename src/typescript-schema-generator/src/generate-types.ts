/* eslint-disable no-console */
import { compileFromFile } from 'json-schema-to-typescript';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const inDir = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'schemas',
  'digital-letters',
  '2025-10-draft',
  'events',
);
const outDir = path.resolve(__dirname, '..', 'types');
mkdirSync(outDir, { recursive: true });

const files = readdirSync(inDir).filter((f) =>
  f.endsWith('.flattened.schema.json'),
);

async function main() {
  for (const file of files) {
    const inPath = path.join(inDir, file);
    const base = path.basename(file, '.json');
    const ts = await compileFromFile(inPath, {
      additionalProperties: false,
    });

    // Write a .d.ts file named after the schema title or file.
    writeFileSync(path.join(outDir, `${base}.d.ts`), ts);
    console.log('Wrote', `${base}.d.ts`);
  }

  // Write an index.d.ts file exporting all types.
  const indexLines = files.map((f) => {
    const base = path.basename(f, '.json');
    return `export * from './${base}';`;
  });
  writeFileSync(path.join(outDir, 'index.d.ts'), `${indexLines.join('\n')}\n`);
}

main().catch((error) => {
  console.error('Error generating types:', error);
  throw error;
});
