#!/usr/bin/env tsx
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { FAILURE_CODE_DEFINITIONS } from './failure-codes.js';

const CSV_PATH = path.resolve(
  __dirname,
  '../../infrastructure/terraform/components/dl/data/failure_codes.csv',
);

function generateCSV(): string {
  const lines = ['code,description'];

  for (const [code, description] of Object.entries(FAILURE_CODE_DEFINITIONS)) {
    const escapedDescription =
      description.includes(',') || description.includes('"')
        ? `"${description.replaceAll('"', '""')}"`
        : description;
    lines.push(`${code},${escapedDescription}`);
  }

  return `${lines.join('\n')}\n`;
}

const csv = generateCSV();
writeFileSync(CSV_PATH, csv, 'utf8');

console.log(`✅ Generated ${CSV_PATH}`);
console.log(
  `   ${Object.keys(FAILURE_CODE_DEFINITIONS).length} failure codes exported`,
);
