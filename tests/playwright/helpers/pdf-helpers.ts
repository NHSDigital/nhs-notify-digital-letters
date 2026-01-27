import { readFileSync } from 'node:fs';
import path from 'node:path';

export const fivePagePdf = () =>
  readFileSync(path.join(__dirname, 'five-page.pdf'));
