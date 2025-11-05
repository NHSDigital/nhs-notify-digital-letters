import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { getCachedSchema, setCachedSchema } from '../cache/schema-cache.ts';
import { diagnoseNhsNumber, validateNhsNumber } from './validator-lib.ts';

// Parse command line arguments
const args = process.argv.slice(2);
let schemaPath, dataPath, baseDir;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--base" && i + 1 < args.length) {
    baseDir = path.resolve(args[i + 1]);
    i++; // skip the next argument
  } else if (!schemaPath) {
    schemaPath = args[i];
  } else if (!dataPath) {
    dataPath = args[i];
  }
}

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
  schemaDir = baseDir;
} else {
  // Find the 'src' directory by walking up from the schema path
  schemaDir = path.dirname(schemaPath);
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
  // If we didn't find 'src' or 'output', fall back to the schema's directory
  if (
    path.basename(schemaDir) !== "src" &&
    path.basename(schemaDir) !== "output"
  ) {
    schemaDir = path.dirname(schemaPath);
  }
}

// Load all .schema.json and .schema.yaml files in the schema directory
function findAllSchemaFiles(dir) {
  let results = [];
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
  return results;
}

const allSchemaFiles = findAllSchemaFiles(schemaDir);
const schemas = {};
const schemasById = {};

for (const fullPath of allSchemaFiles) {
  const relPath = "./" + path.relative(schemaDir, fullPath).replace(/\\/g, "/");
  const file = path.basename(fullPath);
  const absolutePath = path.resolve(fullPath);
  let content;
  try {
    const fileContent = fs.readFileSync(fullPath, "utf-8");
    if (fullPath.endsWith(".yaml") || fullPath.endsWith(".yml")) {
      content = yaml.load(fileContent);
    } else {
      content = JSON.parse(fileContent);
    }
  } catch (e) {
    continue;
  }
  if (
    typeof content !== "object" ||
    content === null ||
    Array.isArray(content)
  ) {
    continue;
  }

  // Keep the original $id if it exists
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

// Function to load external HTTP/HTTPS schemas or base-relative paths
const requestCounts = new Map(); // Track request counts per URI to prevent infinite loops
const MAX_REQUESTS_PER_URI = 5; // Prevent infinite loops

async function loadExternalSchema(uri) {
  // Detect metaschema self-references and block them
  const normalizedUri = uri.replace(/#$/, ''); // Remove trailing fragment
  if (normalizedUri === 'http://json-schema.org/draft-07/schema' ||
      normalizedUri === 'https://json-schema.org/draft-07/schema') {
    console.log(`[FETCH] BLOCKED: Metaschema self-reference detected for ${uri} - skipping to prevent infinite loop`);
    // Return a minimal schema that won't cause validation issues
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

  // For HTTP/HTTPS URLs, check cache (which now handles HTTP fetching with retry)
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    const cached = await getCachedSchema(uri);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(`[CACHE] Failed to parse cached schema for ${uri}:`, e.message);
        throw new Error(`Failed to parse schema from ${uri}`);
      }
    }
    // If cache returns null, fetching failed
    throw new Error(`Failed to fetch schema from ${uri} after retries`);
  }

  // Handle base-relative paths (starting with /)
  if (uri.startsWith('/')) {
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
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        let content;
        if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
          content = yaml.load(fileContent);
        } else {
          content = JSON.parse(fileContent);
        }
        // Cache it for future use
        schemas[uri] = content;
        // Return a copy without the $id to avoid conflicts when AJV tries to add it
        const schemaCopy = { ...content };
        delete schemaCopy.$id;
        return schemaCopy;
      } catch (e) {
        throw new Error(`Failed to load schema from ${filePath}: ${e.message}`);
      }
    }
  }

  throw new Error(`Cannot load schema from URI: ${uri}`);
}

const ajv = new Ajv2020({
  strict: false,
  loadSchema: loadExternalSchema,
  verbose: true // Enable schema and parentSchema in error objects
});
addFormats(ajv);

// Only add schemas by absolute file paths (ignore any relative $id in the schema files)
// This ensures proper $ref resolution based on file system location
const schemasByAbsolutePath = new Map();

// Collect schemas by absolute path
for (const [id, s] of Object.entries(schemas)) {
  if (path.isAbsolute(id)) {
    schemasByAbsolutePath.set(id, s);
  }
}

// Add each schema - use original $id if it exists and is not a file path, otherwise use absolute path
const added = new Set();
for (const [absolutePath, s] of schemasByAbsolutePath.entries()) {
  if (!added.has(absolutePath)) {
    try {
      // Prefer the original $id if it's a URL or schema-relative path
      let schemaId;
      const originalId = s.$id;
      if (originalId && typeof originalId === 'string') {
        // URLs
        if (originalId.startsWith('http://') || originalId.startsWith('https://')) {
          schemaId = originalId;
        }
        // Schema-relative paths (start with / but don't look like file system paths)
        else if (originalId.startsWith('/') && !originalId.startsWith('/home') && !originalId.startsWith('/tmp') && !originalId.startsWith('/var')) {
          schemaId = originalId;
        } else {
          // File system path, use absolute path
          schemaId = absolutePath;
        }
      } else {
        // No $id, use absolute path
        schemaId = absolutePath;
      }
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

ajv.addFormat("nhs-number", {
  type: "string",
  validate: validateNhsNumber,
});

// Determine the main schema and its ID
let mainSchemaFile = allSchemaFiles.find(
  (f) => path.resolve(schemaPath) === path.resolve(f)
);
let mainSchema;
let mainSchemaId;
if (mainSchemaFile) {
  mainSchema = schemas[path.resolve(mainSchemaFile)];
  // Prefer the original $id if it exists and is not a file system path
  const originalId = mainSchema.$id;
  if (originalId && typeof originalId === 'string') {
    // Check if it's an absolute URL
    if (originalId.startsWith('http://') || originalId.startsWith('https://')) {
      mainSchemaId = originalId;
    }
    // Check if it's a schema-relative path - starts with / but doesn't look like a full file system path
    // (doesn't contain the actual output directory structure)
    else if (originalId.startsWith('/') && !originalId.startsWith('/home') && !originalId.startsWith('/tmp') && !originalId.startsWith('/var')) {
      mainSchemaId = originalId;
    } else {
      // It's likely a file path, use absolute path
      mainSchemaId = path.resolve(mainSchemaFile);
    }
  } else {
    mainSchemaId = path.resolve(mainSchemaFile);
  }
} else {
  // Schema file not found in the loaded schemas
  // Check if the file exists locally
  if (fs.existsSync(schemaPath)) {
    const mainContent = fs.readFileSync(schemaPath, "utf-8");
    if (schemaPath.endsWith(".yaml") || schemaPath.endsWith(".yml")) {
      mainSchema = yaml.load(mainContent);
    } else {
      mainSchema = JSON.parse(mainContent);
    }
    mainSchemaId = mainSchema.$id || path.resolve(schemaPath);
  } else {
    // File doesn't exist locally
    // Try to construct an HTTP URL based on the file path
    // Example: /home/rb/.../output/common/2025-11-draft/nhs-notify-profile.schema.json
    // becomes: https://notify.nhs.uk/cloudevents/schemas/common/2025-11-draft/nhs-notify-profile.schema.json

    const match = schemaPath.match(/\/(common|examples|supplier-allocation)\/([^\/]+)\/(.+\.schema\.json)$/);
    if (match) {
      const [, domain, version, filename] = match;
      mainSchemaId = `https://notify.nhs.uk/cloudevents/schemas/${domain}/${version}/${filename}`;
      console.log(`⚠️  Local schema not found: ${schemaPath}`);
      console.log(`   Will attempt to load from: ${mainSchemaId}`);
      // We'll let AJV's loadSchema handle fetching this
      mainSchema = null; // Will be loaded asynchronously
    } else {
      console.error(`❌ Schema file not found: ${schemaPath}`);
      console.error(`   Could not determine HTTP URL for remote loading`);
      process.exit(1);
    }
  }
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
    // Print more debug info for each error
    for (const err of validate.errors || []) {
      // Traverse data to the error path
      let value = data;
      if (err.instancePath) {
        for (const part of err.instancePath.replace(/^\//, "").split("/")) {
          if (part) value = value && value[part];
        }
      }
      console.error(`\nError at path: ${err.instancePath}`);
      console.error("  Value:", JSON.stringify(value));
      console.error("  Schema path:", err.schemaPath);
      console.error("  Keyword:", err.keyword);
      if (err.params) console.error("  Params:", JSON.stringify(err.params));
      if (err.message) console.error("  Message:", err.message);

      // Extract helpful information from parentSchema (available with verbose: true)
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
          console.error("  Schema constraint details:");
          for (const detail of details) {
            console.error(`    ${detail}`);
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
          console.error("  Failing constraint:");
          for (const detail of schemaDetails) {
            console.error(`    ${detail}`);
          }
        }
      }
      // Enrich nhs-number format failures with checksum details
      if (
        err.keyword === "format" &&
        err.params &&
        err.params.format === "nhs-number"
      ) {
        const diag = diagnoseNhsNumber(value);
        if (!diag.valid) {
          const extra =
            `NHS Number invalid: ${diag.reason}` +
            (diag.expectedCheck !== undefined
              ? ` (expected check ${diag.expectedCheck}, got ${diag.providedCheck})`
              : "");
          console.error("  Detail:", extra);
        }
      }
    }
    process.exit(1);
  }
})().catch((err) => {
  console.error("Validation error:", err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
