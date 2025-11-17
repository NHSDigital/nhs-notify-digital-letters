/**
 * SchemaDiscoverer class - Recursively discovers schema dependencies
 *
 * This class provides a testable, injectable way to discover all schema dependencies
 * by following allOf references in JSON/YAML schemas.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type {
  DiscovererConfig,
  DiscoveryResult,
  FileSystem,
  PathInterface,
  SchemaObject,
} from './schema-discoverer-types.ts';

export class SchemaDiscoverer {
  private baseOutputDir: string;
  private domainsSeparator: string;
  private fs: FileSystem;
  private path: PathInterface;

  /**
   * Create a new SchemaDiscoverer
   * @param config Configuration options including baseOutputDir and optional fs/path overrides
   */
  constructor(config: DiscovererConfig) {
    this.baseOutputDir = config.baseOutputDir;
    this.domainsSeparator = config.domainsSeparator || '/domains/';
    this.fs = config.fs || fs;
    this.path = config.path || path;
  }

  /**
   * Discover all dependencies from a root schema file
   * @param rootSchemaPath Path to the root schema file
   * @returns DiscoveryResult with dependencies or error
   */
  public discover(rootSchemaPath: string): DiscoveryResult {
    const resolvedPath = this.path.resolve(rootSchemaPath);

    if (!this.fs.existsSync(resolvedPath)) {
      return {
        success: false,
        dependencies: new Set(),
        errorMessage: `Root schema file not found: ${resolvedPath}`,
      };
    }

    const visited = new Set<string>();
    const dependencies = new Set<string>();

    try {
      this.discoverRecursive(resolvedPath, visited, dependencies);

      if (dependencies.size === 0) {
        return {
          success: false,
          dependencies: new Set(),
          errorMessage: `No dependencies discovered for ${resolvedPath}`,
        };
      }

      return {
        success: true,
        dependencies,
      };
    } catch (error) {
      return {
        success: false,
        dependencies: new Set(),
        errorMessage: `Discovery failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Load a schema from file (JSON or YAML)
   * @param filePath Path to schema file
   * @returns Parsed schema object or null on error
   */
  public loadSchema(filePath: string): SchemaObject | null {
    try {
      const content = this.fs.readFileSync(filePath, 'utf-8');
      if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
        return yaml.load(content) as SchemaObject;
      } else {
        return JSON.parse(content) as SchemaObject;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve a relative reference from a schema file to an absolute path
   * @param schemaFilePath Path to the schema file containing the reference
   * @param ref The $ref value to resolve
   * @returns Absolute path to referenced file or null if not resolvable
   */
  public resolveReference(schemaFilePath: string, ref: string): string | null {
    // Handle only relative references that point to local files
    if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('/')) {
      return null; // Skip external or absolute references
    }

    const schemaDir = this.path.dirname(schemaFilePath);
    const referencedPath = this.path.resolve(schemaDir, ref);

    if (this.fs.existsSync(referencedPath)) {
      return referencedPath;
    }

    return null;
  }

  /**
   * Convert a source schema path to its corresponding output path
   * @param sourcePath Path to source schema file
   * @returns Output path or null if conversion fails
   */
  public sourceToOutputPath(sourcePath: string): string | null {
    // Convert from src/cloudevents/domains/... to output/...
    const absolutePath = this.path.resolve(sourcePath);

    // Find the domains separator in the path
    const domainsIndex = absolutePath.indexOf(this.domainsSeparator);
    if (domainsIndex === -1) {
      return null;
    }

    // Extract the path after the domains separator
    const afterDomains = absolutePath.substring(domainsIndex + this.domainsSeparator.length);

    // Convert .yaml to .json
    const jsonPath = afterDomains.replace(/\.yaml$/, '.json').replace(/\.yml$/, '.json');

    return this.path.resolve(this.baseOutputDir, jsonPath);
  }

  /**
   * Get the base output directory
   */
  public getBaseOutputDir(): string {
    return this.baseOutputDir;
  }

  /**
   * Recursively discover all schema dependencies (private implementation)
   * @param schemaPath Path to current schema file
   * @param visited Set of already visited paths (for cycle detection)
   * @param dependencies Set to accumulate discovered dependencies
   */
  private discoverRecursive(
    schemaPath: string,
    visited: Set<string>,
    dependencies: Set<string>
  ): void {
    // Avoid infinite loops
    if (visited.has(schemaPath)) {
      return;
    }
    visited.add(schemaPath);

    const schema = this.loadSchema(schemaPath);
    if (!schema) {
      return;
    }

    // Add this schema to dependencies (convert to output path)
    const outputPath = this.sourceToOutputPath(schemaPath);
    if (outputPath) {
      dependencies.add(outputPath);
    }

    // Recursively process allOf references
    if (schema.allOf && Array.isArray(schema.allOf)) {
      for (const item of schema.allOf) {
        if (item.$ref) {
          const referencedPath = this.resolveReference(schemaPath, item.$ref);
          if (referencedPath) {
            this.discoverRecursive(referencedPath, visited, dependencies);
          }
        }
      }
    }

    // Also check for $ref at the root level
    if (schema.$ref) {
      const referencedPath = this.resolveReference(schemaPath, schema.$ref);
      if (referencedPath) {
        this.discoverRecursive(referencedPath, visited, dependencies);
      }
    }

    // Check for allOf in properties (nested schemas)
    if (schema.properties) {
      for (const propSchema of Object.values(schema.properties)) {
        if (propSchema.allOf && Array.isArray(propSchema.allOf)) {
          for (const item of propSchema.allOf) {
            if (item.$ref) {
              const referencedPath = this.resolveReference(schemaPath, item.$ref);
              if (referencedPath) {
                this.discoverRecursive(referencedPath, visited, dependencies);
              }
            }
          }
        }
      }
    }
  }
}
