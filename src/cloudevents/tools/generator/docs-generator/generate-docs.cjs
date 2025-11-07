#!/usr/bin/env node
/**
 * Generate static documentation for JSON Schemas using json-schema-static-docs.
 *
 * Usage: node generate-docs.cjs <input-dir> <output-dir>
 *
 * The script will generate markdown documentation for all JSON schemas in the input
 * directory, preserving the folder structure in the output directory.
 */
const path = require("path");
const fs = require("fs");
const JsonSchemaStaticDocs = require("json-schema-static-docs");

// Dynamic import of ES module cache
let getCachedSchema, setCachedSchema;

(async () => {
  // Import the TypeScript ES module cache at runtime
  const cacheModule = await import("../cache/schema-cache.ts");
  getCachedSchema = cacheModule.getCachedSchema;
  setCachedSchema = cacheModule.setCachedSchema;

  // Store the original fetch function
  const originalFetch = globalThis.fetch;

  // Monkey-patch fetch to use our cache for schema requests
  globalThis.fetch = async function(url, options) {
    const urlString = url.toString();

    // Only intercept schema-related HTTP(S) requests
    if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
      console.log(`[FETCH INTERCEPT] Intercepted fetch request for: ${urlString}`);

      // Check cache (which now includes in-memory caching and HTTP fetching with retry)
      const cached = await getCachedSchema(urlString);
      if (cached) {
        console.log(`[FETCH INTERCEPT] ✓ Using cached schema`);
        return new Response(cached, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // If cache returns null, it failed after retries
      console.log(`[FETCH INTERCEPT] ✗ Failed to fetch schema`);
      return new Response(JSON.stringify({ error: 'Failed to fetch schema' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fall back to original fetch for non-HTTP(S) requests
    return originalFetch.call(this, url, options);
  };

  console.log("[FETCH INTERCEPT] Global fetch monkey-patched to use cache");

  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node generate-docs.cjs <input-dir> <output-dir>");
    console.error("Example: node generate-docs.cjs ./output ./docs");
    process.exit(1);
  }

  const inputDir = path.resolve(args[0]);
  const outputDir = path.resolve(args[1]);

  console.log("Input directory:", inputDir);
  console.log("Output directory:", outputDir);

  if (!fs.existsSync(inputDir)) {
    console.error("Input directory does not exist:", inputDir);
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("Generating documentation...");

  // Function to load external schemas from HTTP URLs
  const loadExternalSchema = async (uri) => {
    // Check cache (which now includes in-memory caching and HTTP fetching)
    const cached = await getCachedSchema(uri);
    if (cached) {
      try {
        const schema = JSON.parse(cached);
        return schema;
      } catch (e) {
        console.warn(`[CACHE] Failed to parse cached schema for ${uri}:`, e.message);
      }
    }

    // Cache handles fetching, so if we get here and cached is null, it failed
    console.log(`📥 Schema not available for: ${uri}`);
    return null;
  };

  // Helper function to find all HTTP $ref references in a schema
  const findHttpRefs = (obj, refs = new Set()) => {
    if (!obj || typeof obj !== 'object') return refs;

    if (obj.$ref && typeof obj.$ref === 'string') {
      // Extract base URL without fragment
      const refUrl = obj.$ref.split('#')[0];
      if (refUrl.startsWith('http')) {
        refs.add(refUrl);
      }
    }

    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        findHttpRefs(obj[key], refs);
      }
    }

    return refs;
  };

  // Pre-scan schemas to find HTTP $ref references and pre-load them recursively
  const fastGlob = require("fast-glob");
  const schemaFiles = await fastGlob(path.join(inputDir, "**/*.schema.{json,yml}"));
  const externalRefs = new Set();

  for (const schemaFile of schemaFiles) {
    try {
      const content = fs.readFileSync(schemaFile, "utf-8");
      const schema = JSON.parse(content);
      findHttpRefs(schema, externalRefs);
    } catch (e) {
      // Skip if can't parse
    }
  }

  // Recursively load all external schemas and their dependencies
  const externalSchemas = {};
  const loadedUrls = new Set();

  const loadSchemaRecursively = async (url) => {
    if (loadedUrls.has(url)) {
      return; // Already loaded or in progress
    }

    loadedUrls.add(url); // Mark as in progress to prevent concurrent requests

    try {
      const schema = await loadExternalSchema(url);

      // Skip if schema loading was blocked (returns false)
      if (schema === false) {
        return;
      }

      externalSchemas[url] = schema;

      // Find and load any dependencies in this schema
      const deps = findHttpRefs(schema);
      for (const dep of deps) {
        if (!loadedUrls.has(dep)) {
          await loadSchemaRecursively(dep);
        }
      }
    } catch (e) {
      console.error(`   ❌ Failed to load ${url}: ${e.message}`);
      console.error(`   Continuing with documentation generation (may encounter validation issues)...`);
      // Keep URL marked as loaded to prevent retry loops
    }
  };

  if (externalRefs.size > 0) {
    console.log(`\n🌐 Found ${externalRefs.size} external schema reference(s), pre-loading recursively...`);
    for (const ref of externalRefs) {
      await loadSchemaRecursively(ref);
    }
    console.log(`📦 Loaded ${loadedUrls.size} total external schema(s) including dependencies`);
    console.log();
  }

  // Generate documentation directly from input directory
  // Include all .schema.json files, excluding example event JSON files
  const generator = new JsonSchemaStaticDocs({
    inputPath: inputDir,
    outputPath: outputDir,
    inputFileGlob: "**/*.schema.{yml,json}",
    jsonSchemaVersion: "https://json-schema.org/draft/2020-12/schema",
    ajvOptions: {
      allowUnionTypes: true,
      strict: false,
      strictSchema: false,
      strictTypes: false,
      strictTuples: false,
      strictRequired: false,
      validateSchema: false, // Disable schema validation to avoid metaschema issues
      addUsedSchema: false,  // Don't automatically add schemas to avoid conflicts
      loadSchema: loadExternalSchema,
      schemas: Object.entries(externalSchemas).map(([uri, schema]) => {
        // Ensure each schema has an $id field set to its URI
        return { ...schema, $id: uri };
      }), // Pre-add external schemas with proper IDs
      formats: {
        "nhs-number": {
          type: "string",
          validate: (s) =>
            /^(?:[0-9]{10}|[0-9]{3}[- ]?[0-9]{3}[- ]?[0-9]{4})$/.test(s),
        },
      },
    },
  });
  try {
    await generator.generate();

    console.log(`\n✅ Documentation generated in: ${outputDir}`);

    // Copy example event JSON files from output/*/example-events/ to docs/*/example-events/
    console.log("\nCopying example event instances...");
    const copyExampleEvents = (srcDir) => {
      const items = fs.readdirSync(srcDir, { withFileTypes: true });
      for (const item of items) {
        const srcPath = path.join(srcDir, item.name);
        if (item.isDirectory()) {
          if (item.name === "example-events") {
            // Found an example-events directory - copy its contents to docs
            const relativePath = path.relative(inputDir, srcDir);
            const destDir = path.join(
              outputDir,
              relativePath,
              "example-events"
            );

            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }

            const eventFiles = fs
              .readdirSync(srcPath)
              .filter((f) => f.endsWith(".json"));
            for (const eventFile of eventFiles) {
              const srcFile = path.join(srcPath, eventFile);
              const destFile = path.join(destDir, eventFile);
              fs.copyFileSync(srcFile, destFile);
              console.log(
                `  Copied: ${path.relative(
                  inputDir,
                  srcFile
                )} -> ${path.relative(outputDir, destFile)}`
              );

              // Generate markdown documentation for this example event
              const mdFile = destFile.replace(".json", ".md");
              const eventData = JSON.parse(fs.readFileSync(srcFile, "utf-8"));

              // Find the corresponding event schema name
              const eventBaseName = eventFile.replace("-event.json", "");
              const domainPath = path.relative(
                inputDir,
                path.dirname(path.dirname(srcPath))
              );

              // Generate markdown content
              let mdContent = `# ${eventData.type || "Example Event"}\n\n`;
              mdContent += `**Event Type:** \`${eventData.type}\`\n\n`;
              mdContent += `**Source:** \`${eventData.source}\`\n\n`;
              if (eventData.subject) {
                mdContent += `**Subject:** \`${eventData.subject}\`\n\n`;
              }
              mdContent += `**Event ID:** \`${eventData.id}\`\n\n`;
              mdContent += `**Timestamp:** ${eventData.time}\n\n`;

              mdContent += `## Related Schema Documentation\n\n`;
              mdContent += `- [Event Schema](../${eventBaseName}.schema.md)\n`;
              mdContent += `- [Event Schema (Bundled)](../${eventBaseName}.bundle.schema.md)\n`;
              mdContent += `- [Event Schema (Flattened)](../${eventBaseName}.flattened.schema.md)\n\n`;

              mdContent += `## Complete Event Instance\n\n`;
              mdContent += "```json\n";
              mdContent += JSON.stringify(eventData, null, 2);
              mdContent += "\n```\n";

              fs.writeFileSync(mdFile, mdContent, "utf-8");
              console.log(`  Generated: ${path.relative(outputDir, mdFile)}`);
            }
          } else {
            // Recurse into subdirectories
            copyExampleEvents(srcPath);
          }
        }
      }
    };

    copyExampleEvents(inputDir);
    console.log("✅ Example events copied to docs");
  } catch (err) {
    console.error("Failed to generate docs:", err);
    process.exit(1);
  }

  // Post-processing: add anchors for property allOf subsections and link them in the top Properties table.

  try {
    const outputPath = outputDir;

    try {
      // Recursively find all .md files
      const findMarkdownFiles = (dir) => {
        let results = [];
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            results = results.concat(findMarkdownFiles(fullPath));
          } else if (item.isFile() && item.name.endsWith(".md")) {
            results.push(fullPath);
          }
        }
        return results;
      };

      const docsFiles = findMarkdownFiles(outputPath);

      for (const mdFilePath of docsFiles) {
        let md = fs.readFileSync(mdFilePath, "utf-8");

        // 1. Add explicit anchors for headings like `### type.0` so we can link deterministically.
        md = md.replace(
          /^### ([A-Za-z0-9_-]+)\.(\d+)\s*$/gm,
          (m, prop, idx) => {
            const anchorId = `${prop}-${idx}`.toLowerCase();
            // Avoid duplicating if already enhanced
            if (md.includes(`<a id="${anchorId}">`)) return m;
            return `### <a id="${anchorId}"></a> ${prop}.${idx}`;
          }
        );

        // 2. In the top Properties summary table, convert the anonymous All of rows (repeated primitive types)
        //    into links pointing to the anchors we just added. We detect a pattern with rowspan+"All of:".
        //    Example row pattern (first row):
        //    <tr><td rowspan="9">type</td><td rowspan="9">All of:</td><td>String</td></tr>
        //    followed by N-1 rows like: <tr><td>String</td></tr>
        md = md.replace(
          /(<tr><td rowspan="(\d+)">([^<]+)<\/td><td rowspan="\2">All of:<\/td><td>)([^<]+)(<\/td><\/tr>)([\s\S]*?)(?=<\/tbody>)/,
          (
            full,
            startPrefix,
            countStr,
            propName,
            firstType,
            endSuffix,
            tail
          ) => {
            const count = parseInt(countStr, 10);
            // Collect subsequent simple rows to modify; we'll rebuild them.
            // Extract each subsequent <tr><td>TypeName</td></tr>
            const rowRegex = /<tr><td>([^<]+)<\/td><\/tr>/g;
            const rows = [];
            let match;
            let consumedLength = 0;
            while ((match = rowRegex.exec(tail)) && rows.length < count - 1) {
              rows.push({
                type: match[1],
                raw: match[0],
                index: rows.length + 1,
                start: match.index,
                end: match.index + match[0].length,
              });
              consumedLength = match.index + match[0].length;
            }
            if (rows.length !== count - 1) {
              // Could not confidently parse; leave unchanged.
              return full;
            }

            // Build new first row with link to anchor id (propName-0) and link property name itself to its section heading anchor
            const safeProp = propName.trim().toLowerCase();
            // Link property name in the first cell
            // Replace property name cell contents with anchor link (keep rowspan value intact)
            const startPrefixLinked = startPrefix.replace(
              new RegExp(`(<tr><td rowspan="${count}">)${propName}</td>`),
              `$1<a href="#${safeProp}">${propName}</a></td>`
            );
            let rebuilt = `${startPrefixLinked}<a href="#${safeProp}-0">${firstType}</a>${endSuffix}`;
            // Rebuild subsequent rows linking to anchors
            for (let i = 0; i < rows.length; i++) {
              const r = rows[i];
              rebuilt += `\n<tr><td><a href="#${safeProp}-${i + 1}">${
                r.type
              }</a></td></tr>`;
            }
            // Append any remaining tail content after the rows we consumed
            const remainder = tail.slice(consumedLength).replace(/^/, "");
            return rebuilt + remainder;
          }
        );

        // Additional pass: linkify any remaining unprocessed All of clusters in the Properties table (the above only handled the first occurrence).
        try {
          const linkifyRemainingAllOf = () => {
            let changed = false;
            // Pattern for an unprocessed All of cluster start (property name not yet wrapped in <a>, and first subtype primitive not linked)
            const startRegex =
              /<tr><td rowspan="(\d+)">([^<]+)<\/td><td rowspan="\1">All of:<\/td><td>([^<]+)<\/td><\/tr>/g;
            let match;
            while ((match = startRegex.exec(md)) !== null) {
              const [full, countStr, propName, firstType] = match;
              const count = parseInt(countStr, 10);
              const blockStart = match.index;
              let cursor = blockStart + full.length;
              const rows = [];
              for (let i = 1; i < count; i++) {
                const rowMatch = md
                  .slice(cursor)
                  .match(/^<tr><td>([^<]+)<\/td><\/tr>/);
                if (!rowMatch) break;
                rows.push(rowMatch[1]);
                cursor += rowMatch[0].length;
              }
              if (rows.length !== count - 1) continue; // not a clean cluster; skip
              // Skip if already linkified (property cell already contains an anchor or first subtype already linked)
              if (full.includes('<a href="#')) continue;
              const safeProp = propName.trim().toLowerCase();
              let rebuilt = `<tr><td rowspan="${count}"><a href="#${safeProp}">${propName}</a></td><td rowspan="${count}">All of:</td><td><a href="#${safeProp}-0">${firstType}</a></td></tr>`;
              rows.forEach((t, idx) => {
                rebuilt += `\n<tr><td><a href="#${safeProp}-${
                  idx + 1
                }">${t}</a></td></tr>`;
              });
              md = md.slice(0, blockStart) + rebuilt + md.slice(cursor);
              changed = true;
              // Adjust regex lastIndex to continue after the rebuilt block
              startRegex.lastIndex = blockStart + rebuilt.length;
            }
            return changed;
          };
          // Run until no further changes (safe guard max iterations)
          for (let i = 0; i < 10; i++) {
            if (!linkifyRemainingAllOf()) break;
          }
        } catch (e) {
          // non-fatal
        }

        fs.writeFileSync(mdFilePath, md, "utf-8");

        // 3. Surface 'not' patterns from original schema allOf subschemas (disallowed patterns) into each subsection table.
        try {
          // Find corresponding schema file - replace .md with .json and look in inputDir
          const relativePath = path.relative(outputPath, mdFilePath);
          const schemaJsonName = relativePath.replace(/\.md$/, ".json");
          const schemaPath = path.join(inputDir, schemaJsonName);
          if (fs.existsSync(schemaPath)) {
            const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
            if (schema && schema.properties) {
              const propsWithAllOf = [];
              for (const [propName, propDef] of Object.entries(
                schema.properties
              )) {
                if (Array.isArray(propDef.allOf) && propDef.allOf.length) {
                  propsWithAllOf.push(propName);
                  propDef.allOf.forEach((sub, idx) => {
                    const notPat = sub && sub.not && sub.not.pattern;
                    if (!notPat) return; // only care about disallowed pattern entries
                    // Anchor id we generated earlier
                    const anchorId = `${propName}-${idx}`.toLowerCase();
                    // Regex to capture the table body for this subsection heading
                    const sectionRegex = new RegExp(
                      `(### <a id="${anchorId}"></a> ${propName}\\.${idx}\\n<table class="jssd-property-table">\\n  <tbody>\\n)([\\s\\S]*?)(\\n  </tbody>)`
                    );
                    md = md.replace(sectionRegex, (m, start, body, end) => {
                      // Avoid duplication
                      if (body.includes("Disallowed Pattern")) return m;
                      const esc = (s) =>
                        s
                          .replace(/&/g, "&amp;")
                          .replace(/</g, "&lt;")
                          .replace(/>/g, "&gt;");
                      let rowsToAdd = "";
                      // Add description row if sub.description exists and not already present
                      if (
                        sub.description &&
                        !body.includes("<th>Description</th>")
                      ) {
                        rowsToAdd += `    <tr>\n      <th>Description</th>\n      <td colspan="2">${esc(
                          sub.description
                        )}</td>\n    </tr>\n`;
                      }
                      rowsToAdd += `    <tr>\n      <th>Disallowed Pattern</th>\n      <td colspan="2"><code>${esc(
                        notPat
                      )}</code></td>\n    </tr>\n`;
                      return `${start}${rowsToAdd}${body}${end}`;
                    });
                  });
                }
              }
              // Add explicit heading anchor for each property with allOf and link its internal property-level All of rows.
              propsWithAllOf.forEach((propName) => {
                const safeProp = propName.toLowerCase();
                // Insert anchor into heading if not already
                const headingRegex = new RegExp(`^## ${propName}$`, "m");
                if (
                  headingRegex.test(md) &&
                  !new RegExp(
                    `^## <a id="${safeProp}"></a> ${propName}$`,
                    "m"
                  ).test(md)
                ) {
                  md = md.replace(
                    headingRegex,
                    `## <a id="${safeProp}"></a> ${propName}`
                  );
                }
                // Within the section for this property, link the property-level All of rows for Type the same way as the summary table
                const sectionRegex = new RegExp(
                  `(## <a id="${safeProp}"></a> ${propName}[\s\S]*?<table class="jssd-property-table">[\s\S]*?)(<tr><td rowspan="(\\d+)">Type<\/td><td rowspan="\\3">All of:<\/td><td>)([^<]+)(<\/td><\/tr>)([\\s\\S]*?)(?<tblend><\/tbody>)`
                );
                md = md.replace(
                  sectionRegex,
                  (
                    whole,
                    before,
                    startPrefix,
                    countStr,
                    firstType,
                    endSuffix,
                    tail,
                    tblend
                  ) => {
                    const count = parseInt(countStr, 10);
                    const rowRegex = /<tr><td>([^<]+)<\/td><\/tr>/g;
                    const rows = [];
                    let match;
                    let consumedLength = 0;
                    while (
                      (match = rowRegex.exec(tail)) &&
                      rows.length < count - 1
                    ) {
                      rows.push(match[1]);
                      consumedLength = match.index + match[0].length;
                    }
                    if (rows.length !== count - 1) return whole; // give up
                    let rebuilt = `${startPrefix}<a href="#${safeProp}-0">${firstType}</a>${endSuffix}`;
                    rows.forEach((t, i) => {
                      rebuilt += `\n<tr><td><a href="#${safeProp}-${
                        i + 1
                      }">${t}</a></td></tr>`;
                    });
                    const remainder = tail.slice(consumedLength);
                    return before + rebuilt + remainder + tblend;
                  }
                );
                // Secondary attempt: handle extra wrapping <tr><tr> pattern if first didn't apply
                if (!md.includes(`<a href="#${safeProp}-0">String</a>`)) {
                  const sectionRegex2 = new RegExp(
                    `(## <a id="${safeProp}"></a> ${propName}[\\s\\S]*?<table class="jssd-property-table">[\\s\\S]*?)(<tr><tr><td rowspan="(\\d+)">Type<\\/td><td rowspan="\\3">All of:<\\/td><td>)([^<]+)(<\\/td><\\/tr>)([\\s\\S]*?)(<\\/tr><\\/tr>[\\s\\S]*?<\\/tbody>)`
                  );
                  md = md.replace(
                    sectionRegex2,
                    (
                      whole,
                      before,
                      startPrefix,
                      countStr,
                      firstType,
                      endSuffix,
                      tail,
                      tblend
                    ) => {
                      const count = parseInt(countStr, 10);
                      const rowRegex = /<tr><td>([^<]+)<\/td><\/tr>/g;
                      const rows = [];
                      let match;
                      let consumedLength = 0;
                      while (
                        (match = rowRegex.exec(tail)) &&
                        rows.length < count - 1
                      ) {
                        rows.push(match[1]);
                        consumedLength = match.index + match[0].length;
                      }
                      if (rows.length !== count - 1) return whole;
                      let rebuilt = `${startPrefix}<a href="#${safeProp}-0">${firstType}</a>${endSuffix}`;
                      rows.forEach((t, i) => {
                        rebuilt += `\n<tr><td><a href="#${safeProp}-${
                          i + 1
                        }">${t}</a></td></tr>`;
                      });
                      const remainder = tail.slice(consumedLength);
                      return before + rebuilt + remainder + tblend;
                    }
                  );
                }
                // Fallback: a very permissive parser for a property detail table lacking anchors yet (to catch generator markup anomalies)
                if (!md.includes(`#${safeProp}-0`)) {
                  const genericSectionRegex = new RegExp(
                    `(## <a id="${safeProp}"></a> ${propName}[\s\S]*?<table class="jssd-property-table">[\s\S]*?)(<tr>(?:<tr>)?<td rowspan="(\\d+)">Type<\/td><td rowspan="\\3">All of:<\/td><td>)([^<]+)(<\/td><\/tr>)([\s\S]*?)(<\/tbody>)`
                  );
                  md = md.replace(
                    genericSectionRegex,
                    (
                      whole,
                      before,
                      startPrefix,
                      countStr,
                      firstType,
                      endSuffix,
                      tail,
                      tbodyEnd
                    ) => {
                      if (whole.includes(`#${safeProp}-0`)) return whole; // already linked
                      const count = parseInt(countStr, 10);
                      // Collect up to count-1 subsequent simple cell rows
                      const rowRegex = /<tr><td>([^<]+)<\/td><\/tr>/g;
                      const rows = [];
                      let match;
                      let consumedLength = 0;
                      while (
                        (match = rowRegex.exec(tail)) &&
                        rows.length < count - 1
                      ) {
                        rows.push(match[1]);
                        consumedLength = match.index + match[0].length;
                      }
                      if (rows.length !== count - 1) return whole; // can't confidently transform
                      let rebuilt = `${startPrefix}<a href="#${safeProp}-0">${firstType}</a>${endSuffix}`;
                      rows.forEach((t, i) => {
                        rebuilt += `\n<tr><td><a href="#${safeProp}-${
                          i + 1
                        }">${t}</a></td></tr>`;
                      });
                      const remainder = tail.slice(consumedLength);
                      return before + rebuilt + remainder + tbodyEnd;
                    }
                  );
                }
                // Strongest fallback: detect malformed double <tr><tr> block and reconstruct with links
                if (!md.includes(`#${safeProp}-0`)) {
                  const sectionStart = md.indexOf(
                    `## <a id="${safeProp}"></a> ${propName}`
                  );
                  if (sectionStart !== -1) {
                    const nextHeading = md.indexOf("\n## ", sectionStart + 5);
                    const sectionEnd =
                      nextHeading === -1 ? md.length : nextHeading;
                    const section = md.slice(sectionStart, sectionEnd);
                    const blockRegex =
                      /<tr><tr><td rowspan="(\d+)">Type<\/td><td rowspan="\1">All of:<\/td><td>([^<]+)<\/td><\/tr>((?:<tr><td>[^<]+<\/td><\/tr>){1,200})<\/tr>/;
                    if (blockRegex.test(section)) {
                      const updated = section.replace(
                        blockRegex,
                        (m, countStr, firstType, tailRows) => {
                          const count = parseInt(countStr, 10);
                          const rowRegex = /<tr><td>([^<]+)<\/td><\/tr>/g;
                          const extras = [];
                          let mt;
                          while (
                            (mt = rowRegex.exec(tailRows)) &&
                            extras.length < count - 1
                          ) {
                            extras.push(mt[1]);
                          }
                          if (extras.length !== count - 1) return m; // bail
                          let rebuilt = `<tr><tr><td rowspan="${count}">Type</td><td rowspan="${count}">All of:</td><td><a href="#${safeProp}-0">${firstType}</a></td></tr>`;
                          extras.forEach((t, i) => {
                            rebuilt += `\n<tr><td><a href="#${safeProp}-${
                              i + 1
                            }">${t}</a></td></tr>`;
                          });
                          rebuilt += `</tr>`;
                          return rebuilt;
                        }
                      );
                      if (updated !== section) {
                        md =
                          md.slice(0, sectionStart) +
                          updated +
                          md.slice(sectionEnd);
                      }
                    }
                    // Additional replacement: fully malformed cluster with double closing tag </tr></tr>
                    if (!md.includes(`#${safeProp}-0`)) {
                      const section2 = md.slice(sectionStart, sectionEnd);
                      const blockRegex2 =
                        /<tr><tr><td rowspan="(\d+)">Type<\/td><td rowspan="\1">All of:<\/td><td>([^<]+)<\/td><\/tr>((?:<tr><td>[^<]+<\/td><\/tr>){1,200})<\/tr><\/tr>/;
                      if (blockRegex2.test(section2)) {
                        const updated2 = section2.replace(
                          blockRegex2,
                          (m, countStr, firstType, tailRows) => {
                            const count = parseInt(countStr, 10);
                            const rowRegex = /<tr><td>([^<]+)<\/td><\/tr>/g;
                            const extras = [];
                            let mt;
                            while (
                              (mt = rowRegex.exec(tailRows)) &&
                              extras.length < count - 1
                            ) {
                              extras.push(mt[1]);
                            }
                            if (extras.length !== count - 1) return m;
                            let rebuilt = `<tr><td rowspan="${count}">Type</td><td rowspan="${count}">All of:</td><td><a href="#${safeProp}-0">${firstType}</a></td></tr>`;
                            extras.forEach((t, i) => {
                              rebuilt += `\n<tr><td><a href="#${safeProp}-${
                                i + 1
                              }">${t}</a></td></tr>`;
                            });
                            return rebuilt;
                          }
                        );
                        if (updated2 !== section2) {
                          md =
                            md.slice(0, sectionStart) +
                            updated2 +
                            md.slice(sectionEnd);
                        }
                      }
                    }
                  }
                }
              });
              // Final fallback pass: for any property with allOf whose property-level Type table still lacks links, inject them.
              propsWithAllOf.forEach((propName) => {
                const safeProp = propName.toLowerCase();
                // Locate section boundaries
                const headingPattern = new RegExp(
                  `## <a id="${safeProp}"></a> ${propName}`,
                  "m"
                );
                const headingMatch = headingPattern.exec(md);
                if (!headingMatch) return;
                const sectionStart = headingMatch.index;
                const nextHeadingIdx = md.indexOf("\n## ", sectionStart + 5);
                const sectionEnd =
                  nextHeadingIdx === -1 ? md.length : nextHeadingIdx;
                const section = md.slice(sectionStart, sectionEnd);
                // If already linked, skip
                if (section.includes(`<a href="#${safeProp}-0">`)) return;
                // Identify count from rowspan and capture table up to first subsection heading (### <a id="prop-0">)
                const firstSubHeadingIdx = section.indexOf(
                  `### <a id="${safeProp}-0"></a>`
                );
                const preSub =
                  firstSubHeadingIdx !== -1
                    ? section.slice(0, firstSubHeadingIdx)
                    : section;
                const tableRegex =
                  /<tr><tr><td rowspan="(\d+)">Type<\/td><td rowspan="\1">All of:<\/td><td>String<\/td><\/tr>((?:<tr><td>String<\/td><\/tr>){1,200})<\/tr>/;
                const m = tableRegex.exec(preSub);
                if (!m) return;
                const count = parseInt(m[1], 10);
                const tailRows = m[2];
                // Count existing simple rows (should be count-1)
                const rowCount = (
                  tailRows.match(/<tr><td>String<\/td><\/tr>/g) || []
                ).length;
                if (rowCount !== count - 1) return; // mismatch
                // Build replacement
                let rebuilt = `<tr><tr><td rowspan="${count}">Type</td><td rowspan="${count}">All of:</td><td><a href="#${safeProp}-0">String</a></td></tr>`;
                for (let i = 1; i < count; i++) {
                  rebuilt += `\n<tr><td><a href="#${safeProp}-${i}">String</a></td></tr>`;
                }
                rebuilt += `</tr>`;
                const newSection = section.replace(tableRegex, rebuilt);
                if (newSection !== section) {
                  md =
                    md.slice(0, sectionStart) +
                    newSection +
                    md.slice(sectionEnd);
                }
              });

              // 4. Replace primitive placeholder link text with subschema 'name' labels (if provided) for allOf entries.
              try {
                for (const [propName, propDef] of Object.entries(
                  schema.properties
                )) {
                  if (!Array.isArray(propDef.allOf)) continue;
                  propDef.allOf.forEach((sub, idx) => {
                    if (!sub || typeof sub !== "object") return;
                    // Derive a label: prefer explicit name; else attempt from description (first sentence up to 60 chars); else from not.pattern; else fallback to type.
                    let derivedLabel = sub.name;
                    if (!derivedLabel) {
                      if (sub.description) {
                        derivedLabel = sub.description
                          .split(/\.(?:\s|$)/)[0]
                          .trim();
                      } else if (sub.not && sub.not.pattern) {
                        const pat = sub.not.pattern.replace(/\\/g, "");
                        // Extract token between literal dots if pattern targets a specific banned word
                        const tokenMatch = pat.match(/\.([a-z0-9-]+)\(/);
                        const token = tokenMatch ? tokenMatch[1] : null;
                        if (token) derivedLabel = `Disallow ${token}`;
                      } else if (sub.pattern) {
                        derivedLabel = "Pattern constraint";
                      }
                    }
                    if (!derivedLabel) return; // nothing to change
                    const safeProp = propName.toLowerCase();
                    const esc = (s) =>
                      s
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;");
                    // Replace link text if still a bare primitive (String, Integer, Object, Number, Boolean)
                    const linkRegex = new RegExp(
                      `<a href="#${safeProp}-${idx}">(String|Integer|Object|Number|Boolean)</a>`,
                      "g"
                    );
                    // Show label plus primitive type in parentheses for clarity
                    md = md.replace(
                      linkRegex,
                      (m, prim) =>
                        `<a href="#${safeProp}-${idx}">${esc(
                          derivedLabel
                        )} (${prim})</a>`
                    );
                    // Append the label to the subsection heading if not already present (idempotent)
                    const headingRegex = new RegExp(
                      `(### <a id=\\"${safeProp}-${idx}\\"></a> ${propName}\\.${idx})(?!\\s– )`
                    );
                    md = md.replace(headingRegex, `$1 – ${esc(derivedLabel)}`);
                    // Also replace in any top-level Properties table entry (already handled above but double-check)
                  });
                }
              } catch (e) {
                // non-fatal
              }
              fs.writeFileSync(mdFilePath, md, "utf-8");
            }
          }
          fs.writeFileSync(mdFilePath, md, "utf-8");
        } catch (e) {
          // Non-fatal: continue
        }
      }
      console.log("Post-processing: enhanced allOf property links in docs.");
    } catch (ppErr) {
      console.warn("Post-processing of docs failed:", ppErr.message);
    }
  } catch (err) {
    console.error("Failed to generate docs:", err);
    process.exit(1);
  }
})();
