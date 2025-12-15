// We don't accept user input, so path traversal attacks should not be a risk.
/* eslint-disable security/detect-non-literal-fs-filename */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { destinationPackageName } from 'utils';

/**
 * Creates the specified output directory if it doesn't exist.
 *
 * @param dirName The name of the directory to create.
 * @returns The resolved path to the created directory.
 */
export function createOutputDir(dirName: string): string {
  const outputDir = path.resolve(
    __dirname,
    '..',
    '..',
    destinationPackageName,
    dirName,
  );
  mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

/**
 * Write a file with the specified content to the given path and filename.
 *
 * @param outputDir The directory the file will be written to.
 * @param fileName The name of the file to write.
 * @param content The content to write to the file.
 */
export function writeFile(
  outputDir: string,
  fileName: string,
  content: string,
): void {
  writeFileSync(path.join(outputDir, fileName), content);
}

/**
 * Write an index.d.ts file containing all lines provided.
 *
 * @param outputDir The output directory where the index.d.ts file will be written.
 * @param lines The lines to write to the index.d.ts file.
 */
export function writeTypesIndex(outputDir: string, lines: string[]): void {
  writeFileSync(path.join(outputDir, 'index.d.ts'), `${lines.join('\n')}\n`);
}
