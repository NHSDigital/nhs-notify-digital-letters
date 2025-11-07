#!/usr/bin/env node

/**
 * Render README.md from YAML index
 *
 * This script reads readme-index.yaml and generates the schema tables
 * in README.md, replacing the content between special markers.
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT_DIR = path.resolve(__dirname, "../../../");
const INDEX_FILE = path.join(ROOT_DIR, "readme-index.yaml");
const README_FILE = path.join(ROOT_DIR, "../../README.md");

// Markers for where to insert generated content
const START_MARKER = "<!-- AUTO-GENERATED-CONTENT:START -->";
const END_MARKER = "<!-- AUTO-GENERATED-CONTENT:END -->";

/**
 * Render a markdown table
 */
function renderTable(headers, rows) {
  const lines = [];

  // Header row
  lines.push("| " + headers.join(" | ") + " |");

  // Separator row
  lines.push(
    "| " +
      headers.map((h) => "-".repeat(Math.max(h.length, 3))).join(" | ") +
      " |"
  );

  // Data rows
  for (const row of rows) {
    lines.push("| " + row.join(" | ") + " |");
  }

  return lines.join("\n");
}

/**
 * Render common schemas section
 */
function renderCommonSchemas(common) {
  const lines = [];
  // If no common schemas, return empty section or skip
  if (!common || !common.versions || common.versions.length === 0) {
    lines.push("## Common Schemas (Shared Across All Domains)");
    lines.push("");
    lines.push("_No common schemas defined yet._");
    lines.push("");
    return lines.join("\n");
  }
  lines.push("## Common Schemas (Shared Across All Domains)");
  lines.push("");

  // Render each version
  for (const versionData of common.versions) {
    lines.push(`### Version: ${versionData.version}`);
    lines.push("");

    const headers = [
      "Schema",
      "Source (YAML)",
      "Published Schema",
      "Documentation",
    ];
    const rows = [];

    for (const schema of versionData.schemas) {
      rows.push([
        `**${schema.type}**`,
        schema.source === "_Generated_"
          ? schema.source
          : `[\`${schema.source}\`](${schema.source})`,
        `[\`${schema.published}\`](${schema.published})`,
        `[\`${schema.docs}\`](${schema.docs})`,
      ]);
    }

    lines.push(renderTable(headers, rows));
    lines.push("");

    // Render example events for this version if available
    if (versionData.exampleEvents && versionData.exampleEvents.length > 0) {
      lines.push("#### Example Events");
      lines.push("");
      lines.push(renderDomainExampleEvents(versionData.exampleEvents));
      lines.push("");
    }
  }

  lines.push("**Purpose:**");
  lines.push("");

  for (const [schemaName, purpose] of Object.entries(common.purposes)) {
    lines.push(`- **${schemaName}**: ${purpose}`);
  }

  return lines.join("\n");
}

/**
 * Render domain schemas table
 */
function renderDomainSchemas(schemas) {
  const headers = [
    "Schema Type",
    "Source (YAML)",
    "Published Schema",
    "Documentation",
  ];
  const rows = [];

  for (const schema of schemas) {
    rows.push([
      `**${schema.type}**`,
      schema.source === "_Generated_"
        ? schema.source
        : `[\`${schema.source}\`](${schema.source})`,
      `[\`${schema.published}\`](${schema.published})`,
      `[\`${schema.docs}\`](${schema.docs})`,
    ]);
  }

  return renderTable(headers, rows);
}

/**
 * Render domain example events table
 */
function renderDomainExampleEvents(events) {
  if (events.length === 0) {
    return "_No example events available_";
  }

  const headers = ["Event Name", "Event Instance", "Documentation"];
  const rows = [];

  for (const event of events) {
    rows.push([
      `**${event.name}**`,
      `[\`${event.json}\`](${event.json})`,
      `[\`${event.markdown}\`](${event.markdown})`,
    ]);
  }

  return renderTable(headers, rows);
}

/**
 * Render a complete domain section
 */
function renderDomain(domain) {
  const lines = [];

  lines.push(`## ${domain.displayName} Domain`);
  lines.push("");
  lines.push(`**Purpose:** ${domain.purpose}`);
  lines.push("");

  // Render each version
  for (const versionData of domain.versions) {
    lines.push(`### Version: ${versionData.version}`);
    lines.push("");
    lines.push(renderDomainSchemas(versionData.schemas));
    lines.push("");

    // Render example events for this version if available
    if (versionData.exampleEvents && versionData.exampleEvents.length > 0) {
      lines.push("#### Example Events");
      lines.push("");
      lines.push(renderDomainExampleEvents(versionData.exampleEvents));
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Generate the full auto-generated content
 */
function generateContent(index) {
  const sections = [];

  // Common schemas
  sections.push(renderCommonSchemas(index.common));

  // Each domain
  for (const domain of index.domains) {
    sections.push(renderDomain(domain));
  }

  return sections.join("\n");
}

/**
 * Update README.md with generated content
 */
function updateReadme(generatedContent) {
  if (!fs.existsSync(README_FILE)) {
    console.error(`❌ README.md not found: ${README_FILE}`);
    process.exit(1);
  }

  let readme = fs.readFileSync(README_FILE, "utf8");

  // Check if markers exist
  const hasStartMarker = readme.includes(START_MARKER);
  const hasEndMarker = readme.includes(END_MARKER);

  if (!hasStartMarker || !hasEndMarker) {
    console.error("❌ README.md must contain both markers:");
    console.error(`   ${START_MARKER}`);
    console.error(`   ${END_MARKER}`);
    console.error("");
    console.error(
      "💡 Add these markers around the section you want to auto-generate."
    );
    process.exit(1);
  }

  // Replace content between markers
  const startIndex = readme.indexOf(START_MARKER) + START_MARKER.length;
  const endIndex = readme.indexOf(END_MARKER);

  const before = readme.substring(0, startIndex);
  const after = readme.substring(endIndex);

  const newReadme = before + "\n" + generatedContent + "\n" + after;

  fs.writeFileSync(README_FILE, newReadme, "utf8");

  console.log("✅ Updated README.md");
}

/**
 * Main function
 */
function main() {
  console.log("📖 Rendering README from index...");

  // Load index
  if (!fs.existsSync(INDEX_FILE)) {
    console.error(`❌ Index file not found: ${INDEX_FILE}`);
    console.error("💡 Run generate-readme-index.cjs first");
    process.exit(1);
  }

  const indexYaml = fs.readFileSync(INDEX_FILE, "utf8");
  const index = yaml.load(indexYaml);

  const totalCommonSchemas = index.common && index.common.versions
    ? index.common.versions.reduce((sum, v) => sum + v.schemas.length, 0)
    : 0;
  console.log(`📦 Loaded index (generated ${index.generated})`);
  console.log(
    `   - Common: ${totalCommonSchemas} schemas across ${index.common && index.common.versions ? index.common.versions.length : 0} version(s)`
  );
  console.log(`   - Domains: ${index.domains.length}`);

  // Generate content
  const content = generateContent(index);

  // Update README
  updateReadme(content);

  console.log("✅ Done!");
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
