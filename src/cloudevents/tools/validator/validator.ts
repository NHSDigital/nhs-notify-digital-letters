/**
 * Validator class - Encapsulates JSON Schema validation logic
 *
 * This class provides a clean interface for validating JSON data against schemas.
 * It can be used programmatically or via the CLI wrapper (validate.ts).
 */

import Ajv2020 from "ajv/dist/2020.js";
import type { ValidateFunction } from 'ajv';
import addFormats from "ajv-formats";
import fs from "fs";
import { getCachedSchema } from '../cache/schema-cache.ts';
import {
  diagnoseNhsNumber,
  validateNhsNumber,
  findAllSchemaFiles,
  buildSchemaRegistry,
  shouldBlockMetaschema,
  handleHttpSchemaLoad,
  handleBaseRelativeSchemaLoad,
  addCustomFormats,
  addSchemasToAjv,
  findMainSchema,
  formatAllValidationErrors,
} from './validator-lib.ts';
import type { SchemaRegistry, MainSchemaInfo, ValidationResult, ValidatorConfig } from './types.ts';

/**
 * Validator class for JSON Schema validation
 */
export class Validator {
  private ajv: Ajv2020;
  private schemas: Record<string, any>;
  private schemasById: Record<string, any>;
  private schemaDir: string;
  private requestCounts: Map<string, number> = new Map();
  private maxRequestsPerUri: number;

  /**
   * Create a new Validator instance
   * @param config - Configuration for the validator
   */
  constructor(config: ValidatorConfig) {
    this.schemaDir = config.schemaDir;
    this.maxRequestsPerUri = config.maxRequestsPerUri || 5;

    // Load all schema files and build registry
    const allSchemaFiles: string[] = findAllSchemaFiles(this.schemaDir);
    const registry: SchemaRegistry = buildSchemaRegistry(allSchemaFiles, this.schemaDir);
    this.schemas = registry.schemas;
    this.schemasById = registry.schemasById;

    // Create and configure AJV instance
    this.ajv = new Ajv2020({
      strict: false,
      loadSchema: this.loadExternalSchema.bind(this),
      verbose: true // Enable schema and parentSchema in error objects
    });
    addFormats(this.ajv);
    addCustomFormats(this.ajv, validateNhsNumber);

    // Add all schemas to AJV
    addSchemasToAjv(this.ajv, this.schemas);
  }

  /**
   * Validate data against a schema
   * @param schemaPath - Path to the schema file or URL
   * @param dataPath - Path to the data file to validate
   * @returns ValidationResult with validation status and any errors
   */
  async validate(schemaPath: string, dataPath: string): Promise<ValidationResult> {
    try {
      // Find all schema files for main schema detection
      const allSchemaFiles: string[] = findAllSchemaFiles(this.schemaDir);

      // Determine the main schema and its ID
      const { schema: mainSchema, schemaId: mainSchemaId }: MainSchemaInfo = findMainSchema(
        schemaPath,
        allSchemaFiles,
        this.schemas
      );

      // Log if loading remotely
      if (mainSchema === null) {
        console.log(`⚠️  Local schema not found: ${schemaPath}`);
        console.log(`   Will attempt to load from: ${mainSchemaId}`);
      }

      // Load and parse data file
      const data: any = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

      // Compile and validate
      let validateFn: ValidateFunction;

      // Remove the schema from AJV if it was already added, so we can compile it async
      try {
        this.ajv.removeSchema(mainSchemaId);
      } catch (e) {
        // Schema wasn't registered, that's fine
      }

      // Always use compileAsync to support loading external schemas
      if (mainSchema === null) {
        // Use mainSchemaId as a $ref to trigger async loading
        validateFn = await this.ajv.compileAsync({ $ref: mainSchemaId });
      } else {
        validateFn = await this.ajv.compileAsync(mainSchema);
      }

      const valid: boolean = validateFn(data);

      if (valid) {
        return {
          valid: true,
          data,
          schema: mainSchema
        };
      } else {
        const formattedErrors = formatAllValidationErrors(
          validateFn.errors || [],
          data,
          diagnoseNhsNumber
        );
        return {
          valid: false,
          errors: validateFn.errors || [],
          formattedErrors,
          data,
          schema: mainSchema
        };
      }
    } catch (error) {
      // Convert errors to validation result format
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [],
        formattedErrors: `Validation error: ${errorMessage}`
      };
    }
  }

  /**
   * Load external HTTP/HTTPS schemas or base-relative paths
   * @param uri - URI to load schema from
   * @returns Loaded schema object
   * @private
   */
  private async loadExternalSchema(uri: string): Promise<any> {
    // Detect metaschema self-references and block them
    if (shouldBlockMetaschema(uri)) {
      console.log(`[FETCH] BLOCKED: Metaschema self-reference detected for ${uri} - skipping to prevent infinite loop`);
      return { type: "object" };
    }

    // Track request count to prevent infinite loops
    const currentCount: number = this.requestCounts.get(uri) || 0;
    if (currentCount >= this.maxRequestsPerUri) {
      console.log(`[FETCH] BLOCKED: Too many requests (${currentCount}) for ${uri} - checking cache`);
      const cached = await getCachedSchema(uri);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.warn(`[CACHE] Failed to parse cached schema for ${uri}`);
        }
      }
      throw new Error(`Maximum requests exceeded for ${uri} and no cached result available`);
    }
    this.requestCounts.set(uri, currentCount + 1);

    // For HTTP/HTTPS URLs, use handleHttpSchemaLoad
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return await handleHttpSchemaLoad(uri, getCachedSchema);
    }

    // Handle base-relative paths (starting with /)
    if (uri.startsWith('/')) {
      const result = handleBaseRelativeSchemaLoad(uri, this.schemas, this.schemaDir);
      if (result !== null) {
        return result;
      }
    }

    throw new Error(`Cannot load schema from URI: ${uri}`);
  }

  /**
   * Get the schema directory
   * @returns The schema directory path
   */
  getSchemaDir(): string {
    return this.schemaDir;
  }

  /**
   * Get loaded schemas count
   * @returns Number of loaded schemas
   */
  getLoadedSchemasCount(): number {
    return Object.keys(this.schemas).length;
  }
}
