/**
 * Type definitions for documentation generator
 */

/**
 * Configuration options for the documentation generator
 */
export interface DocsGeneratorConfig {
  /** Input directory containing JSON schemas */
  inputDir: string;
  /** Output directory for generated markdown documentation */
  outputDir: string;
  /** Whether to enable verbose logging */
  verbose?: boolean;
}

/**
 * Result of the documentation generation process
 */
export interface DocsGenerationResult {
  /** Whether the generation was successful */
  success: boolean;
  /** Input directory that was processed */
  inputDir: string;
  /** Output directory where docs were generated */
  outputDir: string;
  /** Number of schema files processed */
  schemasProcessed: number;
  /** Number of example events copied */
  exampleEventsCopied: number;
  /** Error message if generation failed */
  error?: string;
}

/**
 * External schema information
 */
export interface ExternalSchemaInfo {
  /** The URL of the external schema */
  url: string;
  /** The loaded schema object */
  schema: any;
}

/**
 * Result of external schema loading
 */
export interface SchemaLoadResult {
  /** Map of URL to loaded schema */
  schemas: Record<string, any>;
  /** Set of URLs that were loaded */
  loadedUrls: Set<string>;
  /** Number of schemas loaded */
  count: number;
}
