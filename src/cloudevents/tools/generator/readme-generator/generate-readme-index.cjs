#!/usr/bin/env node

/**
 * Generate README index from workspace structure
 *
 * This script:
 * 1. Scans src/ to discover domains, versions, and schemas
 * 2. Scans docs/ to discover generated example events
 * 3. Outputs a YAML index file with all metadata
 *
 * The YAML index can then be used to render README tables.
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT_DIR = path.resolve(__dirname, "../../");
const SRC_DIR = path.join(ROOT_DIR, "domains");
const SCHEMAS_DIR = path.join(ROOT_DIR, "schemas");
const OUTPUT_FILE = path.join(ROOT_DIR, "readme-index.yaml");
const METADATA_FILE = path.join(ROOT_DIR, "readme-metadata.yaml");

// DOCS_DIR can be overridden by passing it as a parameter to main()
let DOCS_DIR = path.join(ROOT_DIR, "docs");

// Domains to skip (not event domains)
const SKIP_DIRS = ["common", "tools"];

// Load metadata if it exists
let metadata = {
  domains: {},
  common: { purposes: {} },
  schema_labels: {},
  event_labels: {},
};
if (fs.existsSync(METADATA_FILE)) {
  const metadataYaml = fs.readFileSync(METADATA_FILE, "utf8");
  metadata = yaml.load(metadataYaml);
}

/**
 * Get human-readable name from filename
 */
function getSchemaName(filename) {
  return filename
    .replace(".schema.yaml", "")
    .replace(".schema.json", "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Determine schema category from path and filename
 */
function getSchemaCategory(relativePath, filename) {
  if (filename.endsWith("-profile.schema.yaml")) return "profile";
  if (relativePath.includes("defs/") || relativePath.includes("defs\\"))
    return "definitions";
  if (relativePath.includes("data/") || relativePath.includes("data\\"))
    return "data";
  if (relativePath.includes("events/") || relativePath.includes("events\\"))
    return "events";
  return "other";
}

/**
 * Get schema type label based on filename, category, and metadata overrides
 */
function getSchemaType(filename, category) {
  const baseName = filename
    .replace(".schema.yaml", "")
    .replace(".schema.json", "");

  // Check for override in metadata
  if (metadata.schema_labels && metadata.schema_labels[baseName]) {
    return metadata.schema_labels[baseName];
  }

  if (category === "profile") return "Profile";
  if (category === "definitions") return getSchemaName(filename);
  if (category === "data") {
    return getSchemaName(filename).replace(" Data", " Data");
  }
  if (category === "events") {
    return getSchemaName(filename).replace(" Event", " Event");
  }

  return getSchemaName(filename);
}

/**
 * Get the relative docs path from ROOT_DIR
 */
function getDocsPath(relativePath) {
  const docsRelative = path.relative(ROOT_DIR, DOCS_DIR);
  return path.join(docsRelative, relativePath).replace(/\\/g, '/');
}

/**
 * Recursively find all YAML schema files in a directory
 */
function findSchemaFiles(dir, baseDir = dir) {
  const results = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findSchemaFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".schema.yaml")) {
      const relativePath = path.relative(baseDir, fullPath);
      results.push({
        filename: entry.name,
        relativePath: relativePath,
        fullPath: fullPath,
      });
    }
  }

  return results;
}

/**
 * Find all example event JSON files in docs
 */
function findExampleEvents(docsDir) {
  const results = [];

  if (!fs.existsSync(docsDir)) return results;

  const exampleEventsDir = path.join(docsDir, "example-events");
  if (!fs.existsSync(exampleEventsDir)) return results;

  const entries = fs.readdirSync(exampleEventsDir);

  for (const entry of entries) {
    if (entry.endsWith("-event.json")) {
      const baseName = entry.replace(".json", "");

      // Check for override in metadata
      let eventName = getSchemaName(baseName).replace(" Event", "");
      if (metadata.event_labels && metadata.event_labels[baseName]) {
        eventName = metadata.event_labels[baseName];
      }

      results.push({
        name: eventName,
        filename: baseName,
        json: getDocsPath(path.relative(
          DOCS_DIR,
          path.join(exampleEventsDir, entry)
        )),
        markdown: getDocsPath(path.relative(
          DOCS_DIR,
          path.join(exampleEventsDir, baseName + ".md")
        )),
      });
    }
  }

  return results;
}

/**
 * Get all generated variants (bundled, flattened) for an event schema
 */
function getGeneratedVariants(domain, version, eventBaseName) {
  const variants = [];

  const bundledPath = `schemas/${domain}/${version}/events/${eventBaseName}.bundle.schema.json`;
  const flattenedPath = `schemas/${domain}/${version}/events/${eventBaseName}.flattened.schema.json`;

  if (fs.existsSync(path.join(ROOT_DIR, bundledPath))) {
    variants.push({
      type: "Event (Bundled)",
      source: "_Generated_",
      published: bundledPath,
      docs: getDocsPath(`${domain}/${version}/events/${eventBaseName}.bundle.schema.md`),
    });
  }

  if (fs.existsSync(path.join(ROOT_DIR, flattenedPath))) {
    variants.push({
      type: "Event (Flattened)",
      source: "_Generated_",
      published: flattenedPath,
      docs: getDocsPath(`${domain}/${version}/events/${eventBaseName}.flattened.schema.md`),
    });
  }

  return variants;
}

/**
 * Process a domain directory
 */
function processDomain(domainName) {
  const domainDir = path.join(SRC_DIR, domainName);
  const domainDocsDir = path.join(DOCS_DIR, domainName);

  if (!fs.existsSync(domainDir)) return null;

  // Find all version directories
  const entries = fs.readdirSync(domainDir, { withFileTypes: true });
  const versions = entries
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}(-draft)?$/.test(e.name))
    .map((e) => e.name)
    .sort(); // Sort versions chronologically

  if (versions.length === 0) return null;

  // Process all versions
  const versionData = [];
  for (const version of versions) {
    const versionDir = path.join(domainDir, version);

    // Find all schema files
    const schemaFiles = findSchemaFiles(versionDir, versionDir);

    // Organize schemas by category
    const schemas = [];
    const processedEvents = new Set();

    for (const file of schemaFiles) {
      const category = getSchemaCategory(file.relativePath, file.filename);
      const schemaType = getSchemaType(file.filename, category);

      const schema = {
        type: schemaType,
        category: category,
        source: `src/${domainName}/${version}/${file.relativePath}`,
        published: `schemas/${domainName}/${version}/${file.relativePath.replace(
          ".yaml",
          ".json"
        )}`,
        docs: getDocsPath(`${domainName}/${version}/${file.relativePath.replace(
          ".yaml",
          ".md"
        )}`),
      };

      schemas.push(schema);

      // If this is an event schema, add generated variants
      if (category === "events") {
        const eventBaseName = file.filename.replace(".schema.yaml", "");
        const variants = getGeneratedVariants(
          domainName,
          version,
          eventBaseName
        );
        schemas.push(...variants);
        processedEvents.add(eventBaseName);
      }
    }

    // Find example events for this version
    const versionDocsDir = path.join(domainDocsDir, version);
    const exampleEvents = findExampleEvents(versionDocsDir);

    versionData.push({
      version: version,
      schemas: schemas,
      exampleEvents: exampleEvents,
    });
  }

  // Get purpose from metadata or use default
  let purpose = `${getSchemaName(domainName)} domain`;
  if (
    metadata.domains &&
    metadata.domains[domainName] &&
    metadata.domains[domainName].purpose
  ) {
    purpose = metadata.domains[domainName].purpose;
  }

  return {
    name: domainName,
    displayName: getSchemaName(domainName),
    purpose: purpose,
    versions: versionData,
  };
}

/**
 * Process common schemas
 */
function processCommonSchemas() {
  const commonDir = path.join(SRC_DIR, "common");

  if (!fs.existsSync(commonDir)) return null;

  // Find all version directories
  const entries = fs.readdirSync(commonDir, { withFileTypes: true });
  const versions = entries
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}(-draft)?$/.test(e.name))
    .map((e) => e.name)
    .sort(); // Sort versions chronologically

  if (versions.length === 0) return null;

  // Process all versions
  const versionData = [];
  for (const version of versions) {
    const versionDir = path.join(commonDir, version);
    const schemaFiles = findSchemaFiles(versionDir, versionDir);
    const schemas = [];

    for (const file of schemaFiles) {
      const category = getSchemaCategory(file.relativePath, file.filename);
      const schemaType = getSchemaType(file.filename, category);

      schemas.push({
        type: schemaType,
        category: category,
        source: `src/common/${version}/${file.relativePath}`,
        published: `schemas/common/${version}/${file.relativePath.replace(
          ".yaml",
          ".json"
        )}`,
        docs: getDocsPath(`common/${version}/${file.relativePath.replace(
          ".yaml",
          ".md"
        )}`),
      });
    }

    // Add generated bundled/flattened if they exist
    const profileBaseName = "nhs-notify-profile";
    const bundledPath = `schemas/common/${version}/${profileBaseName}.bundle.schema.json`;
    const flattenedPath = `schemas/common/${version}/${profileBaseName}.flattened.schema.json`;

    if (fs.existsSync(path.join(ROOT_DIR, bundledPath))) {
      schemas.push({
        type: "Profile (Bundled)",
        category: "profile",
        source: "_Generated_",
        published: bundledPath,
        docs: getDocsPath(`common/${version}/${profileBaseName}.bundle.schema.md`),
      });
    }

    if (fs.existsSync(path.join(ROOT_DIR, flattenedPath))) {
      schemas.push({
        type: "Profile (Flattened)",
        category: "profile",
        source: "_Generated_",
        published: flattenedPath,
        docs: getDocsPath(`common/${version}/${profileBaseName}.flattened.schema.md`),
      });
    }

    // Find example events for this version
    const versionDocsDir = path.join(DOCS_DIR, "common", version);
    const exampleEvents = findExampleEvents(versionDocsDir);

    versionData.push({
      version: version,
      schemas: schemas,
      exampleEvents: exampleEvents,
    });
  }

  return {
    versions: versionData,
    purposes: metadata.common?.purposes || {
      "NHS Notify Profile":
        "Base CloudEvents profile with required NHS governance and tracing attributes",
      "NHS Notify Payload":
        "Common wrapper providing data plane and control plane variants with metadata",
      "NHS Notify Metadata":
        "Common metadata fields (team, domain, version, service, etc.)",
      "NHS Number":
        "Reusable NHS Number type (canonical and human-readable formats)",
    },
  };
}

/**
 * Main function
 */
function main(docsBasePath) {
  // Set DOCS_DIR if parameter is provided
  if (docsBasePath) {
    DOCS_DIR = path.resolve(ROOT_DIR, docsBasePath);
  }

  console.log("🔍 Scanning workspace structure...");

  // Process common schemas
  const common = processCommonSchemas();

  // Discover all domains
  const srcEntries = fs.readdirSync(SRC_DIR, { withFileTypes: true });
  const domainDirs = srcEntries
    .filter((e) => e.isDirectory() && !SKIP_DIRS.includes(e.name))
    .map((e) => e.name);

  console.log(`📦 Found domains: ${domainDirs.join(", ")}`);

  // Process each domain
  const domains = [];
  for (const domainName of domainDirs) {
    const domain = processDomain(domainName);
    if (domain) {
      const totalSchemas = domain.versions.reduce(
        (sum, v) => sum + v.schemas.length,
        0
      );
      const totalExampleEvents = domain.versions.reduce(
        (sum, v) => sum + (v.exampleEvents?.length || 0),
        0
      );
      console.log(
        `  ✓ ${domain.displayName}: ${totalSchemas} schemas, ${totalExampleEvents} example events`
      );
      domains.push(domain);
    }
  }

  // Build index structure
  const index = {
    generated: new Date().toISOString(),
    common: common,
    domains: domains,
  };

  // Write YAML file
  const yamlContent = yaml.dump(index, {
    lineWidth: -1, // No line wrapping
    noRefs: true, // Don't use YAML references
    sortKeys: false, // Preserve order
  });

  // Add header comment
  const header = `# AUTO-GENERATED FILE - DO NOT EDIT
# This file is automatically generated by src/tools/generator/generate-readme-index.cjs
# To regenerate, run: make update-readme
# To customize labels and purposes, edit: readme-metadata.yaml

`;

fs.writeFileSync(OUTPUT_FILE, header + yamlContent, "utf8");

  const totalCommonSchemas = common && common.versions
    ? common.versions.reduce((sum, v) => sum + v.schemas.length, 0)
    : 0;
  console.log(`\n✅ Generated index: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
  console.log(
    `   - Common: ${totalCommonSchemas} schemas across ${common && common.versions ? common.versions.length : 0} version(s)`
  );
  console.log(`   - Domains: ${domains.length}`);

  return index;
}

// Run if called directly
if (require.main === module) {
  const docsBasePath = process.argv[2];
  main(docsBasePath);
}

module.exports = { main };
