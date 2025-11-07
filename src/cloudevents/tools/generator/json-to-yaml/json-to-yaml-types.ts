/**
 * Type definitions for JSON to YAML conversion
 */

/**
 * Options for YAML conversion
 */
export interface ConversionOptions {
  /**
   * Maximum line width before wrapping (-1 for no wrapping)
   * @default -1
   */
  lineWidth?: number;

  /**
   * Don't use YAML references
   * @default true
   */
  noRefs?: boolean;

  /**
   * Whether to sort keys alphabetically
   * @default false
   */
  sortKeys?: boolean;

  /**
   * Type of quotes to use for strings
   * @default '"'
   */
  quotingType?: "'" | '"';

  /**
   * Force quotes around all strings
   * @default false
   */
  forceQuotes?: boolean;
}

/**
 * Result of a conversion operation
 */
export interface ConversionResult {
  /**
   * Whether the conversion was successful
   */
  success: boolean;

  /**
   * Error message if conversion failed
   */
  error?: string;
}
