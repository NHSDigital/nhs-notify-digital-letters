/**
 * Type definitions for schema dependency discovery
 */

/**
 * Configuration options for the SchemaDiscoverer
 */
export interface DiscovererConfig {
  /** Base output directory for converted schema paths */
  baseOutputDir: string;
  /** Path segment that separates base path from domain-specific paths (default: '/domains/') */
  domainsSeparator?: string;
  /** Optional file system interface for testing */
  fs?: FileSystem;
  /** Optional path interface for testing */
  path?: PathInterface;
}

/**
 * File system interface for dependency injection
 */
export interface FileSystem {
  readFileSync(path: string, options: { encoding: string } | string): string;
  existsSync(path: string): boolean;
}

/**
 * Path interface for dependency injection
 */
export interface PathInterface {
  resolve(...paths: string[]): string;
  dirname(path: string): string;
}

/**
 * Result of schema discovery operation
 */
export interface DiscoveryResult {
  /** Whether the discovery was successful */
  success: boolean;
  /** Set of discovered schema dependency paths */
  dependencies: Set<string>;
  /** Error message if discovery failed */
  errorMessage?: string;
}

/**
 * A parsed JSON schema object
 */
export interface SchemaObject {
  $schema?: string;
  $ref?: string;
  allOf?: Array<{ $ref?: string; [key: string]: any }>;
  properties?: Record<string, any>;
  [key: string]: any;
}

/**
 * CLI arguments for the discovery tool
 */
export interface CliArgs {
  rootSchemaPath: string;
  baseOutputDir: string;
}
