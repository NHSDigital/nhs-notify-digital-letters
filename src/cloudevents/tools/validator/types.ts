/**
 * TypeScript type definitions for the validator
 */

import type { ErrorObject, ValidateFunction } from 'ajv';

/**
 * Command line configuration parsed from CLI arguments
 */
export interface CommandLineConfig {
  schemaPath: string;
  dataPath: string;
  baseDir?: string;
}

/**
 * Schema registry containing all loaded schemas
 */
export interface SchemaRegistry {
  schemas: Record<string, any>;
  schemasById: Record<string, any>;
}

/**
 * Result of schema validation
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ErrorObject[];
  formattedErrors?: string;
  data?: any;
  schema?: any;
}

/**
 * Information about the main schema being validated
 */
export interface MainSchemaInfo {
  schema: any | null;
  schemaId: string;
}

/**
 * AJV validation error object
 */
export type ValidationError = ErrorObject;

/**
 * NHS Number diagnostic result
 */
export interface NhsDiagnosis {
  valid: boolean;
  reason?: string;
  original?: any;
  cleaned?: string;
  format?: string;
  checkDigit?: {
    expected: number;
    actual: number;
    calculation: string;
  };
}

/**
 * CLI arguments parsed result
 */
export interface CliArgs {
  schemaPath: string;
  dataPath: string;
  baseDir?: string;
}

/**
 * Configuration for Validator class
 */
export interface ValidatorConfig {
  schemaDir: string;
  maxRequestsPerUri?: number;
}
