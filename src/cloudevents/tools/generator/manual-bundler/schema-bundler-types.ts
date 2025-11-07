/**
 * Type definitions for schema bundler
 */

export interface SchemaObject {
  [key: string]: any;
  $ref?: string;
  $id?: string;
  $schema?: string;
  $comment?: string;
  title?: string;
  description?: string;
  type?: string;
  allOf?: any[];
  properties?: Record<string, any>;
  required?: string[];
}

export interface BundlerOptions {
  /** Whether to flatten allOf chains */
  flatten?: boolean;
  /** Root directory for resolving relative paths */
  rootDir?: string;
  /** Base URL for converting relative refs to external URLs */
  baseUrl?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

export interface BundleResult {
  /** The bundled/flattened schema */
  schema: SchemaObject;
  /** Whether the operation was successful */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
}
