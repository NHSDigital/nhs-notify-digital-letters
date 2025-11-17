/**
 * SchemaBundler class for bundling and flattening JSON schemas
 *
 * This class encapsulates the logic for processing JSON schemas with two modes:
 * - Bundle mode: Keeps allOf with $refs intact, only dereferences $refs in properties
 * - Flatten mode: Resolves entire allOf chain, merges properties from all schemas
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getCachedSchema } from '../../cache/schema-cache.ts';
import type { SchemaObject, BundlerOptions, BundleResult } from './schema-bundler-types.ts';

export class SchemaBundler {
  private options: BundlerOptions;

  constructor(options: BundlerOptions = {}) {
    this.options = {
      flatten: false,
      verbose: true,
      ...options
    };
  }

  /**
   * Log a message if verbose mode is enabled
   */
  private log(message: string, ...args: any[]): void {
    if (this.options.verbose) {
      console.log(message, ...args);
    }
  }

  /**
   * Check if a reference is an external URL
   */
  private isExternalRef(ref: string): boolean {
    return ref.startsWith('http://') || ref.startsWith('https://');
  }

  /**
   * Resolve a relative reference path from the current file
   */
  private resolveRefPath(currentFilePath: string, ref: string): string {
    const currentDir = path.dirname(currentFilePath);
    const [refPath] = ref.split('#');
    return path.resolve(currentDir, refPath);
  }

  /**
   * Load a schema from a file (JSON or YAML)
   */
  private loadSchema(filePath: string): SchemaObject {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return yaml.load(content) as SchemaObject;
    }
    return JSON.parse(content);
  }

  /**
   * Fetch an external schema from a URL using cache
   */
  private async fetchExternalSchema(url: string): Promise<SchemaObject> {
    // Check cache (which handles fetching with retry)
    const cached = await getCachedSchema(url);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        this.log(`[CACHE] Failed to parse cached schema for ${url}:`, error);
        throw new Error(`Failed to parse schema from ${url}`);
      }
    }

    // If cache returns null, fetching failed
    throw new Error(`Failed to fetch schema from ${url} after retries`);
  }

  /**
   * Convert relative file refs to external URLs
   */
  private convertRelativeRefsToUrls(
    schema: any,
    sourceFile: string,
    repoRoot: string,
    baseUrl: string
  ): any {
    if (!schema || typeof schema !== 'object') return schema;

    if (Array.isArray(schema)) {
      return schema.map(item => this.convertRelativeRefsToUrls(item, sourceFile, repoRoot, baseUrl));
    }

    const result: any = {};

    for (const [key, value] of Object.entries(schema)) {
      if ((key === '$ref' || key === 'const') && typeof value === 'string') {
        const ref = value;

        // Only process relative file refs (not external http/https or internal #/)
        const isFileUri = ref.startsWith('file://../') || ref.startsWith('file://./');
        const isRelative = ref.startsWith('./') || ref.startsWith('../');

        if (!this.isExternalRef(ref) && !ref.startsWith('#/') && (isFileUri || isRelative)) {
          try {
            // Strip file:// prefix if present
            let cleanRef = ref;
            if (isFileUri) {
              cleanRef = ref.replace(/^file:\/\//, '');
            }

            // Split into path and fragment
            const [refPath, fragment] = cleanRef.split('#');

            // Resolve the relative path
            const resolvedPath = this.resolveRefPath(sourceFile, refPath);

            // Calculate the path relative to output/ root
            const outputPath = path.join(repoRoot, 'output');
            const relativeToOutput = path.relative(outputPath, resolvedPath);

            // Convert to URL path (normalize slashes)
            let urlPath = relativeToOutput.replace(/\\/g, '/');

            // Strip "cloudevents/domains/" prefix if present
            if (urlPath.startsWith('cloudevents/domains/')) {
              urlPath = urlPath.substring('cloudevents/domains/'.length);
            }

            // Construct the final URL
            const fragmentPart = fragment ? `#${fragment}` : '';
            result[key] = `${baseUrl}/${urlPath}${fragmentPart}`;
          } catch (error: any) {
            this.log(`Warning: Could not convert ${ref} to external URL: ${error.message}`);
            result[key] = value;
          }
        } else {
          // Keep external, internal, or already processed refs as-is
          result[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        result[key] = this.convertRelativeRefsToUrls(value, sourceFile, repoRoot, baseUrl);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Dereference $refs in properties only, keeping allOf $refs intact
   */
  private dereferencePropertiesOnly(schema: any, currentFile: string, inAllOf: boolean = false): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    if (Array.isArray(schema)) {
      return schema.map(item => this.dereferencePropertiesOnly(item, currentFile, inAllOf));
    }

    // If this is a $ref in allOf context, keep it as-is
    if (inAllOf && schema.$ref) {
      return schema;
    }

    // If this is a $ref in properties context, dereference it
    if (!inAllOf && schema.$ref && typeof schema.$ref === 'string') {
      const ref = schema.$ref;

      // Keep external HTTP/HTTPS refs
      if (this.isExternalRef(ref)) {
        return schema;
      }

      // Keep internal fragment refs
      if (ref.startsWith('#/')) {
        return schema;
      }

      // Dereference local file refs
      const [refPath, fragment] = ref.split('#');
      if (refPath) {
        try {
          const resolvedPath = this.resolveRefPath(currentFile, refPath);
          const refSchema = this.loadSchema(resolvedPath);

          let target = refSchema;
          if (fragment) {
            const fragmentPath = fragment.substring(1).split('/');
            for (const segment of fragmentPath) {
              if (target && typeof target === 'object') {
                target = target[segment];
              }
            }
          }

          const dereferenced = this.dereferencePropertiesOnly(target, resolvedPath, false);

          // Clean up and add source comment
          let result = dereferenced;
          if (dereferenced && typeof dereferenced === 'object') {
            result = { ...dereferenced };

            // Remove $id to avoid conflicts
            if (result.$id) {
              delete result.$id;
            }

            // Add $comment to track source of dereferenced schema
            const sourceComment = `Dereferenced from: ${ref}`;
            if (result.$comment) {
              result.$comment = `${result.$comment} | ${sourceComment}`;
            } else {
              result.$comment = sourceComment;
            }
          }

          return result;
        } catch (error: any) {
          this.log(`Warning: Could not dereference ${ref}: ${error.message}`);
          return schema;
        }
      }
    }

    // Process object properties
    const result: any = {};

    for (const [key, value] of Object.entries(schema)) {
      if (key === 'allOf') {
        // When we encounter allOf, mark that we're in allOf context
        result[key] = this.dereferencePropertiesOnly(value, currentFile, true);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.dereferencePropertiesOnly(value, currentFile, inAllOf);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Resolve allOf: fetch external/file refs, merge properties
   */
  private async resolveAllOf(allOfArray: any[], currentFile: string): Promise<SchemaObject[]> {
    const resolved: SchemaObject[] = [];

    for (const item of allOfArray) {
      if (item.$ref && typeof item.$ref === 'string') {
        const ref = item.$ref;

        // External ref
        if (this.isExternalRef(ref)) {
          try {
            const externalSchema = await this.fetchExternalSchema(ref);
            resolved.push(externalSchema);
            continue;
          } catch (error: any) {
            this.log(`Warning: Could not fetch external schema ${ref}: ${error.message}`);
            resolved.push(item);
            continue;
          }
        }

        // Internal fragment ref - leave as-is (can't resolve without full schema context)
        if (ref.startsWith('#/')) {
          resolved.push(item);
          continue;
        }

        // Local file ref
        const [refPath, fragment] = ref.split('#');
        if (refPath) {
          try {
            const resolvedPath = this.resolveRefPath(currentFile, refPath);
            const refSchema = this.loadSchema(resolvedPath);

            let target = refSchema;
            if (fragment) {
              const fragmentPath = fragment.substring(1).split('/');
              for (const segment of fragmentPath) {
                if (target && typeof target === 'object') {
                  target = target[segment];
                }
              }
            }

            // Recursively flatten if the referenced schema has allOf
            if (target.allOf) {
              const flattened = await this.flattenAllOf(target, resolvedPath);
              resolved.push(flattened);
            } else {
              resolved.push(target);
            }
          } catch (error: any) {
            this.log(`Warning: Could not resolve ${ref}: ${error.message}`);
            resolved.push(item);
          }
        } else {
          resolved.push(item);
        }
      } else {
        // No $ref, use as-is (possibly recursively flatten if it has allOf)
        if (item.allOf) {
          const flattened = await this.flattenAllOf(item, currentFile);
          resolved.push(flattened);
        } else {
          resolved.push(item);
        }
      }
    }

    return resolved;
  }

  /**
   * Merge properties from multiple schemas, handling conflicts with allOf
   */
  private mergeProperties(schemas: SchemaObject[]): Record<string, any> {
    const merged: Record<string, any> = {};

    for (const schema of schemas) {
      if (schema.properties && typeof schema.properties === 'object') {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (merged[propName]) {
            // Conflict: use allOf to combine constraints
            if (merged[propName].allOf) {
              merged[propName].allOf.push(propSchema);
            } else {
              merged[propName] = {
                allOf: [merged[propName], propSchema]
              };
            }
          } else {
            merged[propName] = propSchema;
          }
        }
      }
    }

    return merged;
  }

  /**
   * Flatten allOf: resolve all refs and merge properties
   */
  private async flattenAllOf(schema: SchemaObject, currentFile: string): Promise<SchemaObject> {
    if (!schema.allOf) {
      // No allOf, process any nested allOfs in properties
      if (schema.properties) {
        const processedProps: Record<string, any> = {};
        for (const [key, value] of Object.entries(schema.properties)) {
          if (value && typeof value === 'object' && value.allOf) {
            processedProps[key] = await this.flattenAllOf(value, currentFile);
          } else {
            processedProps[key] = value;
          }
        }
        return { ...schema, properties: processedProps };
      }
      return schema;
    }

    // Resolve all items in allOf
    const resolvedSchemas = await this.resolveAllOf(schema.allOf, currentFile);

    // Merge properties from allOf items PLUS the root schema's own properties
    const schemasToMerge = [...resolvedSchemas];
    if (schema.properties) {
      // Include root schema's properties in the merge
      schemasToMerge.push({ properties: schema.properties });
    }
    const mergedProperties = this.mergeProperties(schemasToMerge);

    // Merge required arrays
    const requiredSet = new Set<string>();
    for (const s of resolvedSchemas) {
      if (s.required && Array.isArray(s.required)) {
        s.required.forEach(r => requiredSet.add(r));
      }
    }
    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach(r => requiredSet.add(r));
    }

    // Build result
    const result: SchemaObject = {
      ...schema,
      properties: mergedProperties
    };

    if (requiredSet.size > 0) {
      result.required = Array.from(requiredSet);
    }

    // Remove allOf since we've merged it
    delete result.allOf;

    return result;
  }

  /**
   * Bundle or flatten a schema from an entry file
   */
  async bundle(entryPath: string, outputPath: string): Promise<BundleResult> {
    try {
      // Validate input
      if (!fs.existsSync(entryPath)) {
        return {
          schema: {},
          success: false,
          error: `Entry schema not found: ${entryPath}`
        };
      }

      // Load and process schema
      const entrySchema = this.loadSchema(entryPath);

      let processedSchema: SchemaObject;
      if (this.options.flatten) {
        processedSchema = await this.flattenAllOf(entrySchema, entryPath);
      } else {
        processedSchema = this.dereferencePropertiesOnly(entrySchema, entryPath, false);
      }

      // Post-process: convert relative refs to external URLs if baseUrl provided
      if (this.options.baseUrl && this.options.rootDir) {
        processedSchema = this.convertRelativeRefsToUrls(
          processedSchema,
          entryPath,
          this.options.rootDir,
          this.options.baseUrl
        );
      }

      // Calculate $id
      const outFileAbs = path.isAbsolute(outputPath) ? outputPath : path.join(process.cwd(), outputPath);
      const repoRoot = this.options.rootDir ? path.resolve(this.options.rootDir) : process.cwd();
      const outputRoot = path.join(repoRoot, 'output');

      let schemaId: string;
      if (outFileAbs.startsWith(outputRoot)) {
        schemaId = "/" + path.relative(outputRoot, outFileAbs).replace(/\\/g, '/');
      } else if (outFileAbs.includes('/schemas/')) {
        const schemasRoot = path.join(repoRoot, 'schemas');
        const relativePath = path.relative(schemasRoot, outFileAbs).replace(/\\/g, '/');
        schemaId = `https://notify.nhs.uk/cloudevents/schemas/${relativePath}`;
      } else {
        schemaId = path.basename(outputPath);
      }

      // Build properly ordered output
      const orderedOutput: SchemaObject = {};

      orderedOutput.$id = schemaId;
      if (processedSchema.$schema) orderedOutput.$schema = processedSchema.$schema;
      if (processedSchema.title) orderedOutput.title = processedSchema.title;
      if (processedSchema.description) orderedOutput.description = processedSchema.description;
      if (processedSchema.type) orderedOutput.type = processedSchema.type;
      if (processedSchema.allOf) orderedOutput.allOf = processedSchema.allOf;
      if (processedSchema.properties) orderedOutput.properties = processedSchema.properties;
      if (processedSchema.required) orderedOutput.required = processedSchema.required;

      // Copy other fields
      for (const [key, value] of Object.entries(processedSchema)) {
        if (!['$id', '$schema', 'title', 'description', 'type', 'allOf', 'properties', 'required', '$comment'].includes(key)) {
          orderedOutput[key] = value;
        }
      }

      orderedOutput.$comment = ((processedSchema.$comment ? processedSchema.$comment + ' | ' : '') +
        (this.options.flatten ? 'Flattened (allOf resolved, properties merged with per-property allOf for conflicts).' : 'Bundled (allOf preserved, property $refs dereferenced).'));

      return {
        schema: orderedOutput,
        success: true
      };
    } catch (error: any) {
      return {
        schema: {},
        success: false,
        error: error.message || String(error)
      };
    }
  }

  /**
   * Bundle or flatten a schema and write to file
   */
  async bundleToFile(entryPath: string, outputPath: string): Promise<boolean> {
    const result = await this.bundle(entryPath, outputPath);

    if (!result.success) {
      console.error('Failed to process schema:', result.error);
      return false;
    }

    // Write to file
    const outDir = path.dirname(path.resolve(outputPath));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result.schema, null, 2));
    this.log(`✅ ${this.options.flatten ? 'Flattened' : 'Bundled'} schema written to ${outputPath}`);

    return true;
  }
}
