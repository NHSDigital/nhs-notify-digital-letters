/**
 * ReadmeRenderer - Render README.md from YAML index
 *
 * This class reads readme-index.yaml and generates markdown tables
 * for the README.md file, replacing content between special markers.
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import type {
  IndexStructure,
  CommonEntry,
  DomainEntry,
  SchemaEntry,
  ExampleEvent,
} from "./readme-index-generator.ts";

/**
 * Configuration for the ReadmeRenderer
 */
export interface ReadmeRendererOptions {
  /** Root directory of the project */
  rootDir: string;
  /** Path to index file (default: rootDir/readme-index.yaml) */
  indexFile?: string;
  /** Path to README file (default: rootDir/../../README.md) */
  readmeFile?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * ReadmeRenderer - Generates markdown tables from YAML index
 */
export class ReadmeRenderer {
  private rootDir: string;
  private indexFile: string;
  private readmeFile: string;
  private verbose: boolean;

  // Markers for where to insert generated content
  private readonly START_MARKER = "<!-- AUTO-GENERATED-CONTENT:START -->";
  private readonly END_MARKER = "<!-- AUTO-GENERATED-CONTENT:END -->";

  constructor(options: ReadmeRendererOptions) {
    this.rootDir = options.rootDir;
    this.indexFile =
      options.indexFile || path.join(this.rootDir, "readme-index.yaml");
    this.readmeFile =
      options.readmeFile ||
      path.join(this.rootDir, "..", "..", "README.md");
    this.verbose = options.verbose || false;
  }

  /**
   * Load the index from YAML file
   */
  public loadIndex(): IndexStructure {
    if (!fs.existsSync(this.indexFile)) {
      throw new Error(`Index file not found: ${this.indexFile}`);
    }

    const indexYaml = fs.readFileSync(this.indexFile, "utf8");
    return yaml.load(indexYaml) as IndexStructure;
  }

  /**
   * Render a markdown table
   */
  private renderTable(headers: string[], rows: string[][]): string {
    const lines: string[] = [];

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
  private renderCommonSchemas(common: CommonEntry | null): string {
    const lines: string[] = [];

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
      const rows: string[][] = [];

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

      lines.push(this.renderTable(headers, rows));
      lines.push("");

      // Render example events for this version if available
      if (versionData.exampleEvents && versionData.exampleEvents.length > 0) {
        lines.push("#### Example Events");
        lines.push("");
        lines.push(this.renderDomainExampleEvents(versionData.exampleEvents));
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
  private renderDomainSchemas(schemas: SchemaEntry[]): string {
    const headers = [
      "Schema Type",
      "Source (YAML)",
      "Published Schema",
      "Documentation",
    ];
    const rows: string[][] = [];

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

    return this.renderTable(headers, rows);
  }

  /**
   * Render domain example events table
   */
  private renderDomainExampleEvents(events: ExampleEvent[]): string {
    if (events.length === 0) {
      return "_No example events available_";
    }

    const headers = ["Event Name", "Event Instance", "Documentation"];
    const rows: string[][] = [];

    for (const event of events) {
      rows.push([
        `**${event.name}**`,
        `[\`${event.json}\`](${event.json})`,
        `[\`${event.markdown}\`](${event.markdown})`,
      ]);
    }

    return this.renderTable(headers, rows);
  }

  /**
   * Render a complete domain section
   */
  private renderDomain(domain: DomainEntry): string {
    const lines: string[] = [];

    lines.push(`## ${domain.displayName} Domain`);
    lines.push("");
    lines.push(`**Purpose:** ${domain.purpose}`);
    lines.push("");

    // Render each version
    for (const versionData of domain.versions) {
      lines.push(`### Version: ${versionData.version}`);
      lines.push("");
      lines.push(this.renderDomainSchemas(versionData.schemas));
      lines.push("");

      // Render example events for this version if available
      if (versionData.exampleEvents && versionData.exampleEvents.length > 0) {
        lines.push("#### Example Events");
        lines.push("");
        lines.push(this.renderDomainExampleEvents(versionData.exampleEvents));
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Generate the full auto-generated content
   */
  public generateContent(index: IndexStructure): string {
    const sections: string[] = [];

    // Common schemas
    sections.push(this.renderCommonSchemas(index.common));

    // Each domain
    for (const domain of index.domains) {
      sections.push(this.renderDomain(domain));
    }

    return sections.join("\n");
  }

  /**
   * Update README.md with generated content
   */
  public updateReadme(generatedContent: string): void {
    if (!fs.existsSync(this.readmeFile)) {
      throw new Error(`README.md not found: ${this.readmeFile}`);
    }

    let readme = fs.readFileSync(this.readmeFile, "utf8");

    // Check if markers exist
    const hasStartMarker = readme.includes(this.START_MARKER);
    const hasEndMarker = readme.includes(this.END_MARKER);

    if (!hasStartMarker || !hasEndMarker) {
      throw new Error(
        `README.md must contain both markers:\n   ${this.START_MARKER}\n   ${this.END_MARKER}\n\nAdd these markers around the section you want to auto-generate.`
      );
    }

    // Replace content between markers
    const startIndex = readme.indexOf(this.START_MARKER) + this.START_MARKER.length;
    const endIndex = readme.indexOf(this.END_MARKER);

    const before = readme.substring(0, startIndex);
    const after = readme.substring(endIndex);

    const newReadme = before + "\n" + generatedContent + "\n" + after;

    fs.writeFileSync(this.readmeFile, newReadme, "utf8");

    if (this.verbose) {
      console.log("✅ Updated README.md");
    }
  }

  /**
   * Render README from index file
   */
  public render(): void {
    if (this.verbose) {
      console.log("📖 Rendering README from index...");
    }

    // Load index
    const index = this.loadIndex();

    const totalCommonSchemas =
      index.common && index.common.versions
        ? index.common.versions.reduce(
            (sum: number, v) => sum + v.schemas.length,
            0
          )
        : 0;

    if (this.verbose) {
      console.log(`📦 Loaded index (generated ${index.generated})`);
      console.log(
        `   - Common: ${totalCommonSchemas} schemas across ${
          index.common && index.common.versions
            ? index.common.versions.length
            : 0
        } version(s)`
      );
      console.log(`   - Domains: ${index.domains.length}`);
    }

    // Generate content
    const content = this.generateContent(index);

    // Update README
    this.updateReadme(content);

    if (this.verbose) {
      console.log("✅ Done!");
    }
  }

  // Getters for testing
  public getIndexFile(): string {
    return this.indexFile;
  }

  public getReadmeFile(): string {
    return this.readmeFile;
  }

  public getMarkers(): { start: string; end: string } {
    return { start: this.START_MARKER, end: this.END_MARKER };
  }
}
