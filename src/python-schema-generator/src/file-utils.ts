// We don't accept user input, so path traversal attacks should not be a risk.
/* eslint-disable security/detect-non-literal-fs-filename */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Creates the specified output directory if it doesn't exist.
 *
 * @param dirName The name of the directory to create.
 * @returns The resolved path to the created directory.
 */
export function createOutputDir(dirName: string): string {
  const outputDir = path.resolve(__dirname, dirName);
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
