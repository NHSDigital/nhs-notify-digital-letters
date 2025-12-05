/**
 * ReadmeIndexGenerator - Generate YAML index from workspace structure
 *
 * This class scans src/ for domains, versions, and schemas, and docs/ for
 * example events, then outputs a YAML index file with all metadata.
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

/**
 * Configuration for the ReadmeIndexGenerator
 */
export interface ReadmeIndexGeneratorOptions {
  /** Root directory of the project */
  rootDir: string;
  /** Directory containing source schemas (default: rootDir/domains) */
  srcDir?: string;
  /** Directory containing generated schemas (default: rootDir/schemas) */
  schemasDir?: string;
  /** Directory containing documentation (default: rootDir/docs) */
  docsDir?: string;
  /** Path to metadata file (default: rootDir/readme-metadata.yaml) */
  metadataFile?: string;
  /** Path to output index file (default: rootDir/readme-index.yaml) */
  outputFile?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Metadata structure loaded from readme-metadata.yaml
 */
export interface Metadata {
  domains?: Record<string, { purpose?: string }>;
  common?: {
    purposes?: Record<string, string>;
  };
  schema_labels?: Record<string, string>;
  event_labels?: Record<string, string>;
}

/**
 * Schema file information
 */
export interface SchemaFile {
  filename: string;
  relativePath: string;
  fullPath: string;
}

/**
 * Schema entry in index
 */
export interface SchemaEntry {
  type: string;
  category: string;
  source: string;
  published: string;
  docs: string;
}

/**
 * Example event entry in index
 */
export interface ExampleEvent {
  name: string;
  filename: string;
  json: string;
  markdown: string;
}

/**
 * Version data for a domain or common
 */
export interface VersionData {
  version: string;
  schemas: SchemaEntry[];
  exampleEvents: ExampleEvent[];
}

/**
 * Domain entry in index
 */
export interface DomainEntry {
  name: string;
  displayName: string;
  purpose: string;
  versions: VersionData[];
}

/**
 * Common schemas entry in index
 */
export interface CommonEntry {
  versions: VersionData[];
  purposes: Record<string, string>;
}

/**
 * Complete index structure
 */
export interface IndexStructure {
  generated: string;
  common: CommonEntry | null;
  domains: DomainEntry[];
}

/**
 * ReadmeIndexGenerator - Generates YAML index from workspace structure
 */
export class ReadmeIndexGenerator {
  private rootDir: string;
  private srcDir: string;
  private schemasDir: string;
  private docsDir: string;
  private metadataFile: string;
  private outputFile: string;
  private verbose: boolean;
  private metadata: Metadata;

  // Domains to skip (not event domains)
  private readonly SKIP_DIRS = ["common", "tools"];

  constructor(options: ReadmeIndexGeneratorOptions) {
    this.rootDir = options.rootDir;
    this.srcDir = options.srcDir || path.join(this.rootDir, "domains");
    this.schemasDir =
      options.schemasDir || path.join(this.rootDir, "schemas");
    this.docsDir = options.docsDir || path.join(this.rootDir, "docs");
    this.metadataFile =
      options.metadataFile || path.join(this.rootDir, "readme-metadata.yaml");
    this.outputFile =
      options.outputFile || path.join(this.rootDir, "readme-index.yaml");
    this.verbose = options.verbose || false;

    // Load metadata if it exists
    this.metadata = this.loadMetadata();
  }

  /**
   * Load metadata from readme-metadata.yaml
   */
  private loadMetadata(): Metadata {
    if (fs.existsSync(this.metadataFile)) {
      const metadataYaml = fs.readFileSync(this.metadataFile, "utf8");
      return yaml.load(metadataYaml) as Metadata;
    }

    // Return default metadata structure
    return {
      domains: {},
      common: { purposes: undefined },
      schema_labels: {},
      event_labels: {},
    };
  }

  /**
   * Get human-readable name from filename
   */
  private getSchemaName(filename: string): string {
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
  private getSchemaCategory(
    relativePath: string,
    filename: string
  ): string {
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
  private getSchemaType(filename: string, category: string): string {
    const baseName = filename
      .replace(".schema.yaml", "")
      .replace(".schema.json", "");

    // Check for override in metadata
    if (this.metadata.schema_labels && this.metadata.schema_labels[baseName]) {
      return this.metadata.schema_labels[baseName];
    }

    let schemaType: string;

    switch (category) {
      case "profile":
        schemaType = "Profile";
        break;
      case "events":
        schemaType = this.getSchemaName(filename).toLowerCase();
        break;
      default:
        schemaType = this.getSchemaName(filename);
    }

    return schemaType;
  }

  /**
   * Get the relative docs path from rootDir
   */
  private getDocsPath(relativePath: string): string {
    const docsRelative = path.relative(this.rootDir, this.docsDir);
    return path.join(docsRelative, relativePath).replace(/\\/g, "/");
  }

  /**
   * Recursively find all YAML schema files in a directory
   */
  private findSchemaFiles(dir: string, baseDir: string = dir): SchemaFile[] {
    const results: SchemaFile[] = [];

    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        results.push(...this.findSchemaFiles(fullPath, baseDir));
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
  private findExampleEvents(docsDir: string): ExampleEvent[] {
    const results: ExampleEvent[] = [];

    if (!fs.existsSync(docsDir)) return results;

    const exampleEventsDir = path.join(docsDir, "example-events");
    if (!fs.existsSync(exampleEventsDir)) return results;

    const entries = fs.readdirSync(exampleEventsDir);

    for (const entry of entries) {
      if (entry.endsWith("-event.json")) {
        const baseName = entry.replace(".json", "");

        // Check for override in metadata
        let eventName = this.getSchemaName(baseName).replace(" Event", "");
        if (
          this.metadata.event_labels &&
          this.metadata.event_labels[baseName]
        ) {
          eventName = this.metadata.event_labels[baseName];
        }

        results.push({
          name: eventName,
          filename: baseName,
          json: this.getDocsPath(
            path.relative(
              this.docsDir,
              path.join(exampleEventsDir, entry)
            )
          ),
          markdown: this.getDocsPath(
            path.relative(
              this.docsDir,
              path.join(exampleEventsDir, baseName + ".md")
            )
          ),
        });
      }
    }

    return results;
  }

  /**
   * Get all generated variants (bundled, flattened) for an event schema
   */
  private getGeneratedVariants(
    domain: string,
    version: string,
    eventBaseName: string
  ): SchemaEntry[] {
    const variants: SchemaEntry[] = [];

    const bundledPath = `schemas/${domain}/${version}/events/${eventBaseName}.bundle.schema.json`;
    const flattenedPath = `schemas/${domain}/${version}/events/${eventBaseName}.flattened.schema.json`;

    if (fs.existsSync(path.join(this.rootDir, bundledPath))) {
      variants.push({
        type: "Event (Bundled)",
        source: "_Generated_",
        published: bundledPath,
        docs: this.getDocsPath(
          `${domain}/${version}/events/${eventBaseName}.bundle.schema.md`
        ),
        category: "events",
      });
    }

    if (fs.existsSync(path.join(this.rootDir, flattenedPath))) {
      variants.push({
        type: "Event (Flattened)",
        source: "_Generated_",
        published: flattenedPath,
        docs: this.getDocsPath(
          `${domain}/${version}/events/${eventBaseName}.flattened.schema.md`
        ),
        category: "events",
      });
    }

    return variants;
  }

  /**
   * Process a domain directory
   */
  private processDomain(domainName: string): DomainEntry | null {
    const domainDir = path.join(this.srcDir, domainName);
    const domainDocsDir = path.join(this.docsDir, domainName);

    if (!fs.existsSync(domainDir)) return null;

    // Find all version directories
    const entries = fs.readdirSync(domainDir, { withFileTypes: true });
    const versions = entries
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}(-draft)?$/.test(e.name))
      .map((e) => e.name)
      .sort(); // Sort versions chronologically

    if (versions.length === 0) return null;

    // Process all versions
    const versionData: VersionData[] = [];
    for (const version of versions) {
      const versionDir = path.join(domainDir, version);

      // Find all schema files
      const schemaFiles = this.findSchemaFiles(versionDir, versionDir);

      // Organize schemas by category
      const schemas: SchemaEntry[] = [];

      for (const file of schemaFiles) {
        const category = this.getSchemaCategory(
          file.relativePath,
          file.filename
        );
        const schemaType = this.getSchemaType(file.filename, category);

        const schema: SchemaEntry = {
          type: schemaType,
          category: category,
          source: `src/${domainName}/${version}/${file.relativePath}`,
          published: `schemas/${domainName}/${version}/${file.relativePath.replace(
            ".yaml",
            ".json"
          )}`,
          docs: this.getDocsPath(
            `${domainName}/${version}/${file.relativePath.replace(
              ".yaml",
              ".md"
            )}`
          ),
        };

        schemas.push(schema);

        // If this is an event schema, add generated variants
        if (category === "events") {
          const eventBaseName = file.filename.replace(".schema.yaml", "");
          const variants = this.getGeneratedVariants(
            domainName,
            version,
            eventBaseName
          );
          schemas.push(...variants);
        }
      }

      // Find example events for this version
      const versionDocsDir = path.join(domainDocsDir, version);
      const exampleEvents = this.findExampleEvents(versionDocsDir);

      versionData.push({
        version: version,
        schemas: schemas,
        exampleEvents: exampleEvents,
      });
    }

    // Get purpose from metadata or use default
    let purpose = `${this.getSchemaName(domainName)} domain`;
    if (
      this.metadata.domains &&
      this.metadata.domains[domainName] &&
      this.metadata.domains[domainName].purpose
    ) {
      purpose = this.metadata.domains[domainName].purpose!;
    }

    return {
      name: domainName,
      displayName: this.getSchemaName(domainName),
      purpose: purpose,
      versions: versionData,
    };
  }

  /**
   * Process common schemas
   */
  private processCommonSchemas(): CommonEntry | null {
    const commonDir = path.join(this.srcDir, "common");

    if (!fs.existsSync(commonDir)) return null;

    // Find all version directories
    const entries = fs.readdirSync(commonDir, { withFileTypes: true });
    const versions = entries
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}(-draft)?$/.test(e.name))
      .map((e) => e.name)
      .sort(); // Sort versions chronologically

    if (versions.length === 0) return null;

    // Process all versions
    const versionData: VersionData[] = [];
    for (const version of versions) {
      const versionDir = path.join(commonDir, version);
      const schemaFiles = this.findSchemaFiles(versionDir, versionDir);
      const schemas: SchemaEntry[] = [];

      for (const file of schemaFiles) {
        const category = this.getSchemaCategory(
          file.relativePath,
          file.filename
        );
        const schemaType = this.getSchemaType(file.filename, category);

        schemas.push({
          type: schemaType,
          category: category,
          source: `src/common/${version}/${file.relativePath}`,
          published: `schemas/common/${version}/${file.relativePath.replace(
            ".yaml",
            ".json"
          )}`,
          docs: this.getDocsPath(
            `common/${version}/${file.relativePath.replace(".yaml", ".md")}`
          ),
        });
      }

      // Add generated bundled/flattened if they exist
      const profileBaseName = "nhs-notify-profile";
      const bundledPath = `schemas/common/${version}/${profileBaseName}.bundle.schema.json`;
      const flattenedPath = `schemas/common/${version}/${profileBaseName}.flattened.schema.json`;

      if (fs.existsSync(path.join(this.rootDir, bundledPath))) {
        schemas.push({
          type: "Profile (Bundled)",
          category: "profile",
          source: "_Generated_",
          published: bundledPath,
          docs: this.getDocsPath(
            `common/${version}/${profileBaseName}.bundle.schema.md`
          ),
        });
      }

      if (fs.existsSync(path.join(this.rootDir, flattenedPath))) {
        schemas.push({
          type: "Profile (Flattened)",
          category: "profile",
          source: "_Generated_",
          published: flattenedPath,
          docs: this.getDocsPath(
            `common/${version}/${profileBaseName}.flattened.schema.md`
          ),
        });
      }

      // Find example events for this version
      const versionDocsDir = path.join(this.docsDir, "common", version);
      const exampleEvents = this.findExampleEvents(versionDocsDir);

      versionData.push({
        version: version,
        schemas: schemas,
        exampleEvents: exampleEvents,
      });
    }

    return {
      versions: versionData,
      purposes: this.metadata.common?.purposes || {
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
   * Generate the index structure
   */
  public generate(): IndexStructure {
    if (this.verbose) {
      console.log("🔍 Scanning workspace structure...");
    }

    // Process common schemas
    const common = this.processCommonSchemas();

    // Discover all domains
    const srcEntries = fs.readdirSync(this.srcDir, { withFileTypes: true });
    const domainDirs = srcEntries
      .filter((e) => e.isDirectory() && !this.SKIP_DIRS.includes(e.name))
      .map((e) => e.name);

    if (this.verbose) {
      console.log(`📦 Found domains: ${domainDirs.join(", ")}`);
    }

    // Process each domain
    const domains: DomainEntry[] = [];
    for (const domainName of domainDirs) {
      const domain = this.processDomain(domainName);
      if (domain) {
        const totalSchemas = domain.versions.reduce(
          (sum, v) => sum + v.schemas.length,
          0
        );
        const totalExampleEvents = domain.versions.reduce(
          (sum, v) => sum + (v.exampleEvents?.length || 0),
          0
        );
        if (this.verbose) {
          console.log(
            `  ✓ ${domain.displayName}: ${totalSchemas} schemas, ${totalExampleEvents} example events`
          );
        }
        domains.push(domain);
      }
    }

    // Build index structure
    return {
      generated: new Date().toISOString(),
      common: common,
      domains: domains,
    };
  }

  /**
   * Generate index and write to YAML file
   */
  public generateToFile(): IndexStructure {
    const index = this.generate();

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

    fs.writeFileSync(this.outputFile, header + yamlContent, "utf8");

    const totalCommonSchemas =
      index.common && index.common.versions
        ? index.common.versions.reduce((sum: number, v: VersionData) => sum + v.schemas.length, 0)
        : 0;

    if (this.verbose) {
      console.log(
        `\n✅ Generated index: ${path.relative(this.rootDir, this.outputFile)}`
      );
      console.log(
        `   - Common: ${totalCommonSchemas} schemas across ${
          index.common && index.common.versions ? index.common.versions.length : 0
        } version(s)`
      );
      console.log(`   - Domains: ${index.domains.length}`);
    }

    return index;
  }

  // Getters for testing
  public getMetadata(): Metadata {
    return this.metadata;
  }

  public getRootDir(): string {
    return this.rootDir;
  }

  public getSrcDir(): string {
    return this.srcDir;
  }

  public getDocsDir(): string {
    return this.docsDir;
  }

  public getOutputFile(): string {
    return this.outputFile;
  }
}
