/**
 * Validator Library - Extracted testable functions from validate.js
 *
 * This module exports testable functions extracted from the validate.js CLI script
 * to enable unit testing with code coverage collection.
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

/**
 * Find all schema files (.json, .schema.json, .yaml, .yml) in a directory recursively
 * @param {string} dir - Directory to search
 * @returns {string[]} Array of absolute file paths to schema files
 */
export function findAllSchemaFiles(dir) {
  let results = [];

  // Check if directory exists
  if (!fs.existsSync(dir)) {
    return results;
  }

  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findAllSchemaFiles(filePath));
      } else if (
        file.endsWith(".json") ||
        file.endsWith(".schema.json") ||
        file.endsWith(".yaml") ||
        file.endsWith(".yml")
      ) {
        results.push(filePath);
      }
    }
  } catch (error) {
    // Return empty results if directory can't be read
    return results;
  }

  return results;
}

/**
 * Load and parse a schema file (JSON or YAML)
 * @param {string} filePath - Path to schema file
 * @returns {object|null} Parsed schema object or null if invalid
 */
export function loadSchemaFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
      return yaml.load(fileContent);
    } else {
      return JSON.parse(fileContent);
    }
  } catch (e) {
    return null;
  }
}

/**
 * Validate NHS Number format and checksum
 * @param {string} nhsNumber - NHS Number to validate (can include spaces)
 * @returns {boolean} True if valid NHS Number
 */
export function validateNhsNumber(nhsNumber) {
  if (typeof nhsNumber !== "string") return false;

  // Remove spaces and validate format
  const digits = nhsNumber.replace(/\s+/g, "");
  if (!/^\d{10}$/.test(digits)) return false;

  // Calculate checksum
  const nums = digits.split("").map((d) => parseInt(d, 10));
  const check = nums[9];
  const sum = nums.slice(0, 9).reduce((acc, d, i) => acc + d * (10 - i), 0);
  const remainder = sum % 11;
  const expected = 11 - remainder === 11 ? 0 : 11 - remainder;

  // Check digit of 10 is invalid
  if (expected === 10) return false;

  return check === expected;
}

/**
 * Diagnose NHS Number validation issues with detailed error information
 * @param {any} raw - Value to diagnose (typically a string)
 * @returns {object} Diagnosis object with valid flag, reason, and details
 */
export function diagnoseNhsNumber(raw) {
  const original = raw;

  if (typeof raw !== "string") {
    return { valid: false, reason: "Value is not a string", original };
  }

  const digits = raw.replace(/\s+/g, "");
  if (!/^\d{10}$/.test(digits)) {
    return {
      valid: false,
      reason: "Must contain exactly 10 digits (spaces optional for readability)",
      original,
    };
  }

  const nums = digits.split("").map((d) => parseInt(d, 10));
  const providedCheck = nums[9];
  const sum = nums.slice(0, 9).reduce((acc, d, i) => acc + d * (10 - i), 0);
  const remainder = sum % 11;
  let expected = 11 - remainder;
  if (expected === 11) expected = 0; // 11 -> 0 per algorithm

  if (expected === 10) {
    return {
      valid: false,
      reason: "Computed check digit is 10 (reserved = invalid number)",
      expectedCheck: expected,
      providedCheck,
      original,
    };
  }

  if (providedCheck !== expected) {
    return {
      valid: false,
      reason: "Checksum mismatch",
      expectedCheck: expected,
      providedCheck,
      original,
    };
  }

  return {
    valid: true,
    reason: "OK",
    expectedCheck: expected,
    providedCheck,
    original,
  };
}

/**
 * Determine the schema directory by walking up from a given path
 * @param {string} startPath - Starting path (typically schema file path)
 * @returns {string} Determined schema directory
 */
export function determineSchemaDir(startPath) {
  let schemaDir = path.dirname(startPath);

  // Walk up to find 'src' or 'output' directory
  while (schemaDir !== path.dirname(schemaDir)) {
    // Stop at root
    if (
      path.basename(schemaDir) === "src" ||
      path.basename(schemaDir) === "output"
    ) {
      break;
    }
    schemaDir = path.dirname(schemaDir);
  }

  // If we didn't find 'src' or 'output', fall back to the original directory
  if (
    path.basename(schemaDir) !== "src" &&
    path.basename(schemaDir) !== "output"
  ) {
    schemaDir = path.dirname(startPath);
  }

  return schemaDir;
}

/**
 * Parse command line arguments for the validator
 * @param {string[]} args - Command line arguments (typically process.argv.slice(2))
 * @returns {object} Parsed arguments with schemaPath, dataPath, and optional baseDir
 */
export function parseCliArgs(args) {
  let schemaPath = null;
  let dataPath = null;
  let baseDir = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base" && i + 1 < args.length) {
      baseDir = args[i + 1];
      i++; // skip the next argument
    } else if (!schemaPath) {
      schemaPath = args[i];
    } else if (!dataPath) {
      dataPath = args[i];
    }
  }

  return { schemaPath, dataPath, baseDir };
}

/**
 * Check if a file is a schema file based on extension
 * @param {string} filename - File name or path
 * @returns {boolean} True if file is a schema file
 */
export function isSchemaFile(filename) {
  return (
    filename.endsWith(".json") ||
    filename.endsWith(".schema.json") ||
    filename.endsWith(".yaml") ||
    filename.endsWith(".yml")
  );
}

/**
 * Register a schema with multiple path variants for flexible resolution
 * @param {string} absolutePath - Absolute file path to the schema
 * @param {string} relPath - Relative path from schema directory
 * @param {object} content - Parsed schema content
 * @param {object} schemas - Schema registry object to populate
 * @param {object} schemasById - Schema by ID registry object to populate
 */
export function registerSchemaVariants(
  absolutePath: string,
  relPath: string,
  content: any,
  schemas: Record<string, any>,
  schemasById: Record<string, any>
): void {
  const file = path.basename(absolutePath);
  const originalId = content.$id;

  // Register by absolute file path (for proper relative $ref resolution)
  schemas[absolutePath] = content;
  // Also register by relative paths for flexible resolution
  schemas[relPath] = content;
  schemas[file] = content;
  schemas[relPath.substring(2)] = content; // without leading './'
  schemas["/" + relPath.substring(2)] = content; // with leading '/'
  schemas["./" + file] = content; // basename with ./

  if (originalId) {
    schemasById[originalId] = content;
  }
}

/**
 * Build a schema registry from a list of schema files
 * @param {string[]} allSchemaFiles - Array of absolute paths to schema files
 * @param {string} schemaDir - Base schema directory for computing relative paths
 * @returns {object} Object with schemas and schemasById registries
 */
export function buildSchemaRegistry(
  allSchemaFiles: string[],
  schemaDir: string
): { schemas: Record<string, any>; schemasById: Record<string, any> } {
  const schemas = {};
  const schemasById = {};

  for (const fullPath of allSchemaFiles) {
    const relPath = "./" + path.relative(schemaDir, fullPath).replace(/\\/g, "/");
    const absolutePath = path.resolve(fullPath);

    const content = loadSchemaFile(fullPath);
    if (!content) {
      continue;
    }

    if (
      typeof content !== "object" ||
      content === null ||
      Array.isArray(content)
    ) {
      continue;
    }

    registerSchemaVariants(absolutePath, relPath, content, schemas, schemasById);
  }

  return { schemas, schemasById };
}

/**
 * Check if a URI is a metaschema self-reference that should be blocked
 * @param {string} uri - URI to check
 * @returns {boolean} True if URI is a metaschema that should be blocked
 */
export function shouldBlockMetaschema(uri: string): boolean {
  const normalizedUri = uri.replace(/#$/, ''); // Remove trailing fragment
  return (
    normalizedUri === 'http://json-schema.org/draft-07/schema' ||
    normalizedUri === 'https://json-schema.org/draft-07/schema'
  );
}

/**
 * Handle HTTP/HTTPS schema loading with caching
 * @param {string} uri - HTTP/HTTPS URI to load
 * @param {Function} getCachedSchemaFn - Function to retrieve cached schemas
 * @returns {Promise<object>} Loaded schema object
 */
export async function handleHttpSchemaLoad(
  uri: string,
  getCachedSchemaFn: (uri: string) => Promise<string | null>
): Promise<any> {
  const cached = await getCachedSchemaFn(uri);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e: any) {
      throw new Error(`Failed to parse schema from ${uri}: ${e.message}`);
    }
  }
  // If cache returns null, fetching failed
  throw new Error(`Failed to fetch schema from ${uri} after retries`);
}

/**
 * Handle base-relative schema loading (paths starting with /)
 * @param {string} uri - Base-relative URI to load
 * @param {object} schemas - Schema registry
 * @param {string} schemaDir - Base schema directory
 * @returns {object|null} Loaded schema object or null if not found
 */
export function handleBaseRelativeSchemaLoad(
  uri: string,
  schemas: Record<string, any>,
  schemaDir: string
): any | null {
  // First check if the schema is already loaded
  if (schemas[uri]) {
    // Return a copy without the $id to avoid conflicts when AJV tries to add it
    const schemaCopy = { ...schemas[uri] };
    delete schemaCopy.$id;
    return schemaCopy;
  }

  // Try to load from file system relative to baseDir/schemaDir
  // Remove the leading slash to make it relative
  let relativePath = uri.substring(1);

  // If the URI starts with a directory that matches the basename of schemaDir, remove it
  // e.g. if schemaDir is /path/to/output and URI is /output/common/..., strip the /output part
  const baseName = path.basename(schemaDir);
  if (relativePath.startsWith(baseName + '/')) {
    relativePath = relativePath.substring(baseName.length + 1);
  }

  const filePath = path.join(schemaDir, relativePath);
  if (fs.existsSync(filePath)) {
    const content = loadSchemaFile(filePath);
    if (content) {
      // Cache it for future use
      schemas[uri] = content;
      // Return a copy without the $id to avoid conflicts when AJV tries to add it
      const schemaCopy = { ...content };
      delete schemaCopy.$id;
      return schemaCopy;
    }
  }

  return null;
}

/**
 * Determine the appropriate schema ID for a schema
 * @param {object} schema - Schema object
 * @param {string} absolutePath - Absolute file path to the schema
 * @returns {string} Determined schema ID (URL or file path)
 */
export function determineSchemaId(schema: any, absolutePath: string): string {
  const originalId = schema.$id;

  if (originalId && typeof originalId === 'string') {
    // URLs
    if (originalId.startsWith('http://') || originalId.startsWith('https://')) {
      return originalId;
    }
    // Schema-relative paths (start with / but don't look like file system paths)
    if (
      originalId.startsWith('/') &&
      !originalId.startsWith('/home') &&
      !originalId.startsWith('/tmp') &&
      !originalId.startsWith('/var')
    ) {
      return originalId;
    }
  }

  // Default to absolute path
  return absolutePath;
}

/**
 * Add custom format validators to an AJV instance
 * @param {object} ajv - AJV instance to add formats to
 * @param {Function} validateNhsNumberFn - NHS Number validation function
 * @returns {object} The same AJV instance with formats added
 */
export function addCustomFormats(
  ajv: any,
  validateNhsNumberFn: (value: string) => boolean
): any {
  ajv.addFormat("nhs-number", {
    type: "string",
    validate: validateNhsNumberFn,
  });

  return ajv;
}

/**
 * Add schemas to AJV instance with appropriate IDs
 * @param {object} ajv - AJV instance
 * @param {object} schemas - Schema registry with absolute paths as keys
 * @returns {Set<string>} Set of added schema IDs
 */
export function addSchemasToAjv(
  ajv: any,
  schemas: Record<string, any>
): Set<string> {
  const added = new Set<string>();
  const schemasByAbsolutePath = new Map();

  // Collect schemas by absolute path
  for (const [id, s] of Object.entries(schemas)) {
    if (path.isAbsolute(id)) {
      schemasByAbsolutePath.set(id, s);
    }
  }

  // Add each schema - use original $id if it exists and is not a file path, otherwise use absolute path
  for (const [absolutePath, s] of schemasByAbsolutePath.entries()) {
    if (!added.has(absolutePath)) {
      try {
        const schemaId = determineSchemaId(s, absolutePath);
        const schemaCopy = { ...s, $id: schemaId };
        ajv.addSchema(schemaCopy);

        // Also register by the ID
        if (schemaId !== absolutePath) {
          added.add(schemaId);
        }
      } catch (e) {
        // Silently ignore duplicate schema errors
      }
      added.add(absolutePath);
    }
  }

  return added;
}

/**
 * Build a remote schema URL from a schema path
 * @param {string} schemaPath - Path to schema file
 * @returns {string|null} Remote URL or null if pattern doesn't match
 */
export function buildRemoteSchemaUrl(schemaPath: string): string | null {
  const match = schemaPath.match(/\/(common|examples|supplier-allocation)\/([^\/]+)\/(.+\.schema\.json)$/);
  if (match) {
    const [, domain, version, filename] = match;
    return `https://notify.nhs.uk/cloudevents/schemas/${domain}/${version}/${filename}`;
  }
  return null;
}

/**
 * Find and identify the main schema to validate against
 * @param {string} schemaPath - Path to the main schema file
 * @param {string[]} allSchemaFiles - Array of all loaded schema file paths
 * @param {object} schemas - Schema registry
 * @returns {object} Object with schema and schemaId, or null schema if remote
 */
export function findMainSchema(
  schemaPath: string,
  allSchemaFiles: string[],
  schemas: Record<string, any>
): { schema: any | null; schemaId: string } {
  // Check if schema file was loaded
  const mainSchemaFile = allSchemaFiles.find(
    (f) => path.resolve(schemaPath) === path.resolve(f)
  );

  if (mainSchemaFile) {
    const mainSchema = schemas[path.resolve(mainSchemaFile)];
    const schemaId = determineSchemaId(mainSchema, path.resolve(mainSchemaFile));
    return { schema: mainSchema, schemaId };
  }

  // Schema file not found in loaded schemas - check if it exists locally
  if (fs.existsSync(schemaPath)) {
    const content = loadSchemaFile(schemaPath);
    if (content) {
      const schemaId = content.$id || path.resolve(schemaPath);
      return { schema: content, schemaId };
    }
  }

  // File doesn't exist locally - try to construct HTTP URL
  const remoteUrl = buildRemoteSchemaUrl(schemaPath);
  if (remoteUrl) {
    return { schema: null, schemaId: remoteUrl };
  }

  // Could not determine schema
  throw new Error(`Schema file not found and could not determine remote URL: ${schemaPath}`);
}

/**
 * Format a single validation error with context
 * @param {object} err - AJV validation error object
 * @param {any} data - The data being validated
 * @param {Function} diagnoseNhsNumberFn - NHS Number diagnosis function
 * @returns {string} Formatted error message
 */
export function formatValidationError(
  err: any,
  data: any,
  diagnoseNhsNumberFn?: (value: any) => any
): string {
  let output = '';

  // Traverse data to the error path
  let value = data;
  if (err.instancePath) {
    for (const part of err.instancePath.replace(/^\//, "").split("/")) {
      if (part) value = value && value[part];
    }
  }

  output += `\nError at path: ${err.instancePath}\n`;
  output += `  Value: ${JSON.stringify(value)}\n`;
  output += `  Schema path: ${err.schemaPath}\n`;
  output += `  Keyword: ${err.keyword}\n`;
  if (err.params) output += `  Params: ${JSON.stringify(err.params)}\n`;
  if (err.message) output += `  Message: ${err.message}\n`;

  // Extract helpful information from parentSchema
  if (err.parentSchema) {
    const details = [];
    if (err.parentSchema.name) {
      details.push(`Name: ${err.parentSchema.name}`);
    }
    if (err.parentSchema.description) {
      details.push(`Description: ${err.parentSchema.description}`);
    }
    if (err.parentSchema.pattern) {
      details.push(`Pattern: ${err.parentSchema.pattern}`);
    }
    if (err.parentSchema.const !== undefined) {
      details.push(`Expected const: ${JSON.stringify(err.parentSchema.const)}`);
    }
    if (err.parentSchema.enum) {
      details.push(`Allowed values: ${JSON.stringify(err.parentSchema.enum)}`);
    }

    if (details.length > 0) {
      output += "  Schema constraint details:\n";
      for (const detail of details) {
        output += `    ${detail}\n`;
      }
    }
  }

  // Show the actual failing schema constraint value
  if (err.schema && typeof err.schema === 'object') {
    const schemaDetails = [];
    if (err.schema.pattern) {
      schemaDetails.push(`Pattern: ${err.schema.pattern}`);
    }
    if (err.schema.const !== undefined) {
      schemaDetails.push(`Const: ${JSON.stringify(err.schema.const)}`);
    }
    if (err.schema.enum) {
      schemaDetails.push(`Enum: ${JSON.stringify(err.schema.enum)}`);
    }

    if (schemaDetails.length > 0) {
      output += "  Failing constraint:\n";
      for (const detail of schemaDetails) {
        output += `    ${detail}\n`;
      }
    }
  }

  // Enrich nhs-number format failures with checksum details
  if (
    diagnoseNhsNumberFn &&
    err.keyword === "format" &&
    err.params &&
    err.params.format === "nhs-number"
  ) {
    const diag = diagnoseNhsNumberFn(value);
    if (!diag.valid) {
      const extra =
        `NHS Number invalid: ${diag.reason}` +
        (diag.expectedCheck !== undefined
          ? ` (expected check ${diag.expectedCheck}, got ${diag.providedCheck})`
          : "");
      output += `  Detail: ${extra}\n`;
    }
  }

  return output;
}

/**
 * Format all validation errors
 * @param {Array} errors - Array of AJV validation error objects
 * @param {any} data - The data being validated
 * @param {Function} diagnoseNhsNumberFn - NHS Number diagnosis function
 * @returns {string} Formatted error messages
 */
export function formatAllValidationErrors(
  errors: any[],
  data: any,
  diagnoseNhsNumberFn?: (value: any) => any
): string {
  let output = '';

  for (const err of errors) {
    output += formatValidationError(err, data, diagnoseNhsNumberFn);
  }

  return output;
}
