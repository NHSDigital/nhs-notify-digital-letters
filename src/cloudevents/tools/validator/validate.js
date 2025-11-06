import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { getCachedSchema, setCachedSchema } from '../cache/schema-cache.ts';
import {
  diagnoseNhsNumber,
  validateNhsNumber,
  parseCliArgs,
  determineSchemaDir,
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

// Parse command line arguments
const args = process.argv.slice(2);
const { schemaPath, dataPath, baseDir } = parseCliArgs(args);

if (!schemaPath || !dataPath) {
  console.error(
    "Usage: node validate.js [--base <base-dir>] <schema.json|yaml> <data.json>"
  );
  console.error(
    "  --base: Base directory for resolving schema references (default: auto-detect 'src' or schema directory)"
  );
  process.exit(1);
}

// Determine schema directory for loading all schemas
let schemaDir;
if (baseDir) {
  // Use provided base directory
  schemaDir = path.resolve(baseDir);
} else {
  schemaDir = determineSchemaDir(schemaPath);
}

// Load all schema files and build registry
const allSchemaFiles = findAllSchemaFiles(schemaDir);
const { schemas, schemasById } = buildSchemaRegistry(allSchemaFiles, schemaDir);

// Function to load external HTTP/HTTPS schemas or base-relative paths
const requestCounts = new Map(); // Track request counts per URI to prevent infinite loops
const MAX_REQUESTS_PER_URI = 5; // Prevent infinite loops

async function loadExternalSchema(uri) {
  // Detect metaschema self-references and block them
  if (shouldBlockMetaschema(uri)) {
    console.log(`[FETCH] BLOCKED: Metaschema self-reference detected for ${uri} - skipping to prevent infinite loop`);
    return { type: "object" };
  }

  // Track request count to prevent infinite loops
  const currentCount = requestCounts.get(uri) || 0;
  if (currentCount >= MAX_REQUESTS_PER_URI) {
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
  requestCounts.set(uri, currentCount + 1);

  // For HTTP/HTTPS URLs, use handleHttpSchemaLoad
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return await handleHttpSchemaLoad(uri, getCachedSchema);
  }

  // Handle base-relative paths (starting with /)
  if (uri.startsWith('/')) {
    const result = handleBaseRelativeSchemaLoad(uri, schemas, schemaDir);
    if (result !== null) {
      return result;
    }
  }

  throw new Error(`Cannot load schema from URI: ${uri}`);
}

// Create and configure AJV instance
const ajv = new Ajv2020({
  strict: false,
  loadSchema: loadExternalSchema,
  verbose: true // Enable schema and parentSchema in error objects
});
addFormats(ajv);
addCustomFormats(ajv, validateNhsNumber);

// Add all schemas to AJV
addSchemasToAjv(ajv, schemas);

// Determine the main schema and its ID
const { schema: mainSchema, schemaId: mainSchemaId } = findMainSchema(
  schemaPath,
  allSchemaFiles,
  schemas
);

// Log if loading remotely
if (mainSchema === null) {
  console.log(`⚠️  Local schema not found: ${schemaPath}`);
  console.log(`   Will attempt to load from: ${mainSchemaId}`);
}

const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

// Use async validation to support external schema loading
(async () => {
  let validate;

  // Remove the schema from AJV if it was already added, so we can compile it async
  try {
    ajv.removeSchema(mainSchemaId);
  } catch (e) {
    // Schema wasn't registered, that's fine
  }

  // Always use compileAsync to support loading external schemas
  // If mainSchema is null, we use mainSchemaId as a reference to let AJV fetch it
  if (mainSchema === null) {
    // Use mainSchemaId as a $ref to trigger async loading
    validate = await ajv.compileAsync({ $ref: mainSchemaId });
  } else {
    validate = await ajv.compileAsync(mainSchema);
  }
  const valid = validate(data);

  if (valid) {
    console.log("Valid!");
    process.exit(0);
  } else {
    console.error("Invalid:", validate.errors);
    // Print formatted error messages
    const formattedErrors = formatAllValidationErrors(validate.errors || [], data, diagnoseNhsNumber);
    console.error(formattedErrors);
    process.exit(1);
  }
})().catch((err) => {
  console.error("Validation error:", err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
