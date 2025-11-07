#!/usr/bin/env node

/**
 * Update README.md tables from workspace structure
 *
 * This is a wrapper script that:
 * 1. Generates the YAML index from workspace structure
 * 2. Renders the README.md from the index
 */

const { main: generateIndex } = require("./generate-readme-index.cjs");
const { main: renderReadme } = require("./render-readme.cjs");

async function main() {
  console.log("📝 Updating README tables...\n");

  // Get docs base path from command line args
  const docsBasePath = process.argv[2];

  try {
    // Generate index
    generateIndex(docsBasePath);
    console.log("");

    // Render README
    renderReadme();

    console.log("\n✅ README tables updated successfully!");
    console.log(
      "💡 Edit readme-metadata.yaml to customize labels and purposes"
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
