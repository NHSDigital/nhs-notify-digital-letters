/**
 * CLI handler for build-schema
 *
 * This module contains the testable CLI logic for the build-schema tool.
 * It can be imported and tested separately from the entry point.
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

/**
 * Result of CLI execution
 */
export interface CliResult {
  /** Exit code (0 for success, non-zero for error) */
  exitCode: number;
  /** Error message if any */
  error?: string;
  /** Output schema path if successful */
  outputPath?: string;
}

interface JsonSchema {
  $id?: string;
  $ref?: string;
  [key: string]: any;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]) {
  let rootDir: string | undefined;
  let stripPrefix: string | undefined;
  const filtered: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--root-dir' && i + 1 < args.length) {
      rootDir = args[i + 1];
      i++; // Skip the next argument as it's the root dir value
    } else if (a === '--strip-prefix' && i + 1 < args.length) {
      stripPrefix = args[i + 1];
      i++; // Skip the next argument as it's the strip prefix value
    } else {
      filtered.push(a);
    }
  }

  return { rootDir, stripPrefix, filtered };
}

/**
 * Recursively process a schema object to update $ref paths
 * Converts relative file paths to either absolute URLs or built paths
 */
function processRefs(
  schema: any,
  sourceDir: string,
  outputBaseDir: string,
  sourceSchemaPath: string,
  repoRoot: string,
  baseUrl?: string,
  stripPrefix?: string
): any {
  if (typeof schema !== "object" || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) =>
      processRefs(item, sourceDir, outputBaseDir, sourceSchemaPath, repoRoot, baseUrl, stripPrefix)
    );
  }

  const result: any = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === "$ref" && typeof value === "string") {
      // Skip fragment-only references (e.g., "#/definitions/foo")
      if (value.startsWith("#")) {
        result[key] = value;
      }
      // Keep absolute URLs as-is (http://, https://, etc.)
      else if (value.startsWith("http://") || value.startsWith("https://")) {
        result[key] = value;
      }
      // Transform relative file path references (including simple filenames)
      else if (value.startsWith("..") || value.startsWith(".") || value.endsWith(".json") || value.endsWith(".yaml") || value.endsWith(".yml") || value.includes(".yaml#") || value.includes(".yml#") || value.includes(".json#")) {
        // Split ref into path and fragment
        const [refPath, fragment] = value.split("#");

        // Resolve the absolute path of the referenced schema
        const resolvedPath = path.resolve(sourceDir, refPath);

        // Calculate what the output path would be for this referenced schema
        // Assumes the same directory structure is maintained in output
        const relativePath = path.relative(
          path.join(repoRoot, "src"),
          resolvedPath
        );

        // Convert YAML extensions to JSON for the output references
        const outputRelativePath = relativePath
          .replace(/\.yaml$/, '.json')
          .replace(/\.yml$/, '.json');

        if (baseUrl) {
          // Convert to URL (output will be .json)
          let urlPath = outputRelativePath.replace(/\\/g, "/");

          // Strip the prefix if provided
          if (stripPrefix && urlPath.startsWith(stripPrefix + '/')) {
            urlPath = urlPath.substring(stripPrefix.length + 1);
          } else if (stripPrefix && urlPath.startsWith(stripPrefix)) {
            urlPath = urlPath.substring(stripPrefix.length);
          }

          result[key] = fragment ? `${baseUrl}/${urlPath}#${fragment}` : `${baseUrl}/${urlPath}`;
        } else {
          // Keep as relative path but update to point to built location (output will be .json)
          // Calculate where our current file will be in output
          const sourceRelativePath = path.relative(
            path.join(repoRoot, "src"),
            sourceSchemaPath
          );
          const outputFileRelativePath = sourceRelativePath
            .replace(/\.yaml$/, '.json')
            .replace(/\.yml$/, '.json');
          const fromOutputFile = path.join(
            repoRoot,
            "output",
            path.dirname(outputFileRelativePath)
          );

          // Calculate where the referenced file will be in output
          const toBuiltFile = path.join(
            repoRoot,
            "output",
            outputRelativePath
          );

          let relativeRef = path
            .relative(fromOutputFile, toBuiltFile)
            .replace(/\\/g, "/");
          relativeRef = relativeRef.startsWith(".")
            ? relativeRef
            : `./${relativeRef}`;
          result[key] = fragment ? `${relativeRef}#${fragment}` : relativeRef;
        }
      } else {
        // Keep absolute URLs as-is
        result[key] = value;
      }
    } else if (key === "const" && typeof value === "string" && !value.startsWith("http://") && !value.startsWith("https://") && (value.endsWith(".yaml") || value.endsWith(".yml") || value.endsWith(".json") || value.includes(".yaml#") || value.includes(".yml#") || value.includes(".json#") || (value.startsWith("./") && value.includes("schema")))) {
      // Transform const values that reference schema files (skip absolute URLs)
      // First convert .yaml to .json
      let constValue = value.replace(/\.yaml(#|$)/, '.json$1').replace(/\.yml(#|$)/, '.json$1');

      // If it's a relative path and we have a baseUrl, convert to full URL
      if ((constValue.startsWith("./") || constValue.startsWith("../")) && baseUrl) {
        const [refPath, fragment] = constValue.split("#");
        const resolvedPath = path.resolve(sourceDir, refPath);
        const relativePath = path.relative(
          path.join(repoRoot, "src"),
          resolvedPath
        );
        let urlPath = relativePath.replace(/\\/g, "/");

        // Strip the prefix if provided
        if (stripPrefix && urlPath.startsWith(stripPrefix + '/')) {
          urlPath = urlPath.substring(stripPrefix.length + 1);
        } else if (stripPrefix && urlPath.startsWith(stripPrefix)) {
          urlPath = urlPath.substring(stripPrefix.length);
        }

        constValue = fragment ? `${baseUrl}/${urlPath}#${fragment}` : `${baseUrl}/${urlPath}`;
      } else if (constValue.startsWith("./") || constValue.startsWith("../")) {
        // If no baseUrl provided but it's a relative path, convert to file:// URI for CloudEvents compliance
        const [refPath, fragment] = constValue.split("#");
        const resolvedPath = path.resolve(sourceDir, refPath);

        // Calculate the relative path from the output file location
        const sourceRelativePath = path.relative(
          path.join(repoRoot, "src"),
          sourceSchemaPath
        );
        const outputFileRelativePath = sourceRelativePath
          .replace(/\.yaml$/, '.json')
          .replace(/\.yml$/, '.json');
        const fromOutputFile = path.join(
          repoRoot,
          "output",
          path.dirname(outputFileRelativePath)
        );

        // Calculate where the referenced file will be in output
        const referencedRelativePath = path.relative(
          path.join(repoRoot, "src"),
          resolvedPath
        );
        const toBuiltFile = path.join(
          repoRoot,
          "output",
          referencedRelativePath.replace(/\.yaml$/, '.json').replace(/\.yml$/, '.json')
        );

        let relativeRef = path
          .relative(fromOutputFile, toBuiltFile)
          .replace(/\\/g, "/");
        relativeRef = relativeRef.startsWith(".")
          ? relativeRef
          : `./${relativeRef}`;

        // Convert to file:// URI for CloudEvents compliance
        constValue = fragment ? `file://${relativeRef}#${fragment}` : `file://${relativeRef}`;
      }

      result[key] = constValue;
    } else if (key === "examples" && Array.isArray(value)) {
      // Transform examples array - convert .yaml to .json in string values, and apply URL if baseUrl is set
      result[key] = value.map(example => {
        if (typeof example === "string") {
          let exampleValue = example.replace(/\.yaml$/, '.json').replace(/\.yml$/, '.json');

          // If it's a relative path and we have a baseUrl, convert to full URL
          if ((exampleValue.startsWith("./") || exampleValue.startsWith("../")) && baseUrl && exampleValue.includes("schema")) {
            const resolvedPath = path.resolve(sourceDir, exampleValue);
            const relativePath = path.relative(
              path.join(repoRoot, "src"),
              resolvedPath
            );
            let urlPath = relativePath.replace(/\\/g, "/");

            // Strip the prefix if provided
            if (stripPrefix && urlPath.startsWith(stripPrefix + '/')) {
              urlPath = urlPath.substring(stripPrefix.length + 1);
            } else if (stripPrefix && urlPath.startsWith(stripPrefix)) {
              urlPath = urlPath.substring(stripPrefix.length);
            }

            exampleValue = `${baseUrl}/${urlPath}`;
          }

          return exampleValue;
        }
        return example;
      });
    } else if (typeof value === "object") {
      result[key] = processRefs(value, sourceDir, outputBaseDir, sourceSchemaPath, repoRoot, baseUrl, stripPrefix);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Build a schema from source to output with proper $id
 */
export function buildSchema(
  sourceSchemaPath: string,
  outputDir: string,
  baseUrl?: string,
  stripPrefix?: string,
  rootDir?: string
): { success: boolean; outputPath?: string; error?: string } {
  try {
    // Read source schema
    const sourceAbsolutePath = path.resolve(sourceSchemaPath);
    const sourceDir = path.dirname(sourceAbsolutePath);
    const sourceContent = fs.readFileSync(sourceAbsolutePath, "utf-8");

    // Parse based on file extension
    let schema: JsonSchema;
    if (sourceSchemaPath.endsWith('.yaml') || sourceSchemaPath.endsWith('.yml')) {
      schema = yaml.load(sourceContent) as JsonSchema;
    } else {
      schema = JSON.parse(sourceContent);
    }

    // Calculate the output path - always output as JSON
    const schemaFileName = path.basename(sourceSchemaPath)
      .replace(/\.yaml$/, '.json')
      .replace(/\.yml$/, '.json');
    const outputPath = path.join(outputDir, schemaFileName);

    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    // Calculate repo root once for all path operations
    const repoRoot = rootDir ? path.resolve(rootDir) : process.cwd();

    // Calculate the $id
    let schemaId: string;
    if (baseUrl) {
      // Use provided base URL - output will be .json
      const relativePath = path.relative(
        path.join(repoRoot, "src"),
        sourceAbsolutePath
      );
      let jsonRelativePath = relativePath
        .replace(/\.yaml$/, '.json')
        .replace(/\.yml$/, '.json');

      // Strip the prefix if provided
      if (stripPrefix && jsonRelativePath.startsWith(stripPrefix + '/')) {
        jsonRelativePath = jsonRelativePath.substring(stripPrefix.length + 1);
      } else if (stripPrefix && jsonRelativePath.startsWith(stripPrefix)) {
        jsonRelativePath = jsonRelativePath.substring(stripPrefix.length);
      }

      schemaId = `${baseUrl}/${jsonRelativePath.replace(/\\/g, "/")}`;
    } else {
      // Use relative path from output root with leading /
      // This allows relative $refs to resolve correctly in AJV
      const outputRoot = path.join(repoRoot, "output");
      const relativePath = path.relative(outputRoot, outputPath);
      schemaId = "/" + relativePath.replace(/\\/g, "/");
    }

    // Process the schema: add $id and transform $refs
    const builtSchema = {
      $id: schemaId,
      ...processRefs(schema, sourceDir, outputDir, sourceAbsolutePath, repoRoot, baseUrl, stripPrefix),
    };

    // Write the built schema
    fs.writeFileSync(outputPath, JSON.stringify(builtSchema, null, 2) + "\n");

    console.log(`Built: ${sourceSchemaPath}`);
    console.log(`  -> ${outputPath}`);
    console.log(`  $id: ${schemaId}`);

    return { success: true, outputPath };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

/**
 * CLI handler that processes command-line arguments and executes the schema build
 *
 * @param args - Command line arguments (typically process.argv.slice(2))
 * @returns CLI result with exit code
 */
export function handleCli(args: string[]): CliResult {
  const { rootDir, stripPrefix, filtered } = parseArgs(args);
  const [sourceSchemaPath, outputDir, baseUrl] = filtered;

  if (!sourceSchemaPath || !outputDir) {
    const errorMsg = [
      "Usage: ts-node build-schema.ts [--root-dir <path>] [--strip-prefix <prefix>] <source-schema.json|yaml> <output-dir> [base-url]",
      "Example: ts-node build-schema.ts src/common/2025-10/nhs-notify-profile.schema.yaml output/common/2025-10",
      "With URL: ts-node build-schema.ts src/common/2025-10/nhs-notify-profile.schema.yaml output/common/2025-10 https://schema.notify.nhs.uk",
      "With root: ts-node build-schema.ts --root-dir /path/to/repo src/common/2025-10/nhs-notify-profile.schema.yaml output/common/2025-10",
      "With strip prefix: ts-node build-schema.ts --strip-prefix cloudevents/domains src/common/2025-10/nhs-notify-profile.schema.yaml output/common/2025-10 https://schema.notify.nhs.uk"
    ].join("\n");

    console.error(errorMsg);
    return { exitCode: 1, error: "Missing required arguments" };
  }

  const result = buildSchema(sourceSchemaPath, outputDir, baseUrl, stripPrefix, rootDir);

  if (result.success) {
    return { exitCode: 0, outputPath: result.outputPath };
  } else {
    console.error("Error building schema:", result.error);
    return { exitCode: 1, error: result.error };
  }
}
