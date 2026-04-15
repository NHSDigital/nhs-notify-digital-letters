import { parse } from 'csv-parse/sync';
import { readFileSync } from 'node:fs';

export type CsvRow = {
  messageReference: string;
  senderId: string;
};

export function readCsvFile(filePath: string): CsvRow[] {
  const fileContent = readFileSync(filePath, 'utf8');

  const records = parse(fileContent, {
    columns: false,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((row) => ({
    messageReference: row[0],
    senderId: row[1],
  }));
}
