/**
 * JsonToYamlConverter class for converting JSON files to YAML format
 *
 * This class encapsulates the logic for reading JSON files, converting them to YAML,
 * and writing the output with configurable formatting options.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { ConversionOptions, ConversionResult } from './json-to-yaml-types.ts';

/**
 * Default YAML conversion options
 */
const DEFAULT_OPTIONS: Required<ConversionOptions> = {
  lineWidth: -1,
  noRefs: true,
  sortKeys: false,
  quotingType: '"',
  forceQuotes: false
};

export class JsonToYamlConverter {
  private options: Required<ConversionOptions>;

  constructor(options: ConversionOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };
  }

  /**
   * Convert a JSON file to YAML format
   *
   * @param inputFile - Path to the input JSON file
   * @param outputFile - Path to the output YAML file
   * @returns ConversionResult indicating success or failure with error message
   */
  convert(inputFile: string, outputFile: string): ConversionResult {
    try {
      // Read JSON file
      const jsonContent = fs.readFileSync(inputFile, 'utf8');
      const jsonData = JSON.parse(jsonContent);

      // Convert to YAML
      const yamlContent = yaml.dump(jsonData, this.options);

      // Ensure output directory exists
      const outputDir = path.dirname(outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write YAML file
      fs.writeFileSync(outputFile, yamlContent, 'utf8');

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message
      };
    }
  }

  /**
   * Convert JSON data (already parsed) to YAML string
   *
   * @param data - The JSON data to convert
   * @returns YAML string representation
   */
  convertData(data: any): string {
    return yaml.dump(data, this.options);
  }

  /**
   * Get the current conversion options
   */
  getOptions(): Readonly<Required<ConversionOptions>> {
    return { ...this.options };
  }
}
