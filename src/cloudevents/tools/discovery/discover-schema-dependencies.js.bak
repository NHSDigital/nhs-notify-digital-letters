#!/usr/bin/env node

/**
 * discover-schema-dependencies.js
 * Recursively discovers all schema dependencies from an event schema by following allOf references
 *
 * This tool solves the problem of version mismatches where domains might reference different
 * versions of common profiles than their own version. For example, supplier-allocation 2025-12
 * might reference common 2025-11-draft in its allOf, and this tool will discover that dependency.
 *
 * Usage: node discover-schema-dependencies.js <root-schema-path> <base-output-dir>
 *
 * Output: List of absolute paths to all discovered schema dependencies (one per line)
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node discover-schema-dependencies.js <root-schema-path> <base-output-dir>');
    console.error('');
    console.error('Discovers all schema dependencies by recursively following allOf references.');
    console.error('Outputs absolute paths to schema files in the output directory structure.');
    process.exit(1);
}

const rootSchemaPath = path.resolve(args[0]);
const baseOutputDir = path.resolve(args[1]);

if (!fs.existsSync(rootSchemaPath)) {
    console.error(`Error: Root schema file not found: ${rootSchemaPath}`);
    process.exit(1);
}

/**
 * Load a schema from file (JSON or YAML)
 */
function loadSchema(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
            return yaml.load(content);
        } else {
            return JSON.parse(content);
        }
    } catch (error) {
        console.error(`Error loading schema ${filePath}: ${error.message}`);
        return null;
    }
}

/**
 * Resolve a relative reference from a schema file to an absolute path
 */
function resolveReference(schemaFilePath, ref) {
    // Handle only relative references that point to local files
    if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('/')) {
        return null; // Skip external or absolute references
    }

    const schemaDir = path.dirname(schemaFilePath);
    const referencedPath = path.resolve(schemaDir, ref);

    if (fs.existsSync(referencedPath)) {
        return referencedPath;
    }

    return null;
}

/**
 * Convert a source schema path to its corresponding output path
 */
function sourceToOutputPath(sourcePath, baseOutputDir) {
    // Convert from src/cloudevents/domains/... to output/...
    const absolutePath = path.resolve(sourcePath);

    // Find the domains directory in the path
    const domainsIndex = absolutePath.indexOf('/domains/');
    if (domainsIndex === -1) {
        console.error(`Error: Could not find /domains/ in path: ${absolutePath}`);
        return null;
    }

    // Extract the path after /domains/
    const afterDomains = absolutePath.substring(domainsIndex + '/domains/'.length);

    // Convert .yaml to .json
    const jsonPath = afterDomains.replace(/\.yaml$/, '.json');

    return path.resolve(baseOutputDir, jsonPath);
}

/**
 * Recursively discover all schema dependencies
 */
function discoverDependencies(schemaPath, visited = new Set(), dependencies = new Set()) {
    // Avoid infinite loops
    if (visited.has(schemaPath)) {
        return dependencies;
    }
    visited.add(schemaPath);

    const schema = loadSchema(schemaPath);
    if (!schema) {
        return dependencies;
    }

    // Add this schema to dependencies (convert to output path)
    const outputPath = sourceToOutputPath(schemaPath, baseOutputDir);
    dependencies.add(outputPath);

    // Recursively process allOf references
    if (schema.allOf && Array.isArray(schema.allOf)) {
        for (const item of schema.allOf) {
            if (item.$ref) {
                const referencedPath = resolveReference(schemaPath, item.$ref);
                if (referencedPath) {
                    discoverDependencies(referencedPath, visited, dependencies);
                }
            }
        }
    }

    // Also check for $ref at the root level
    if (schema.$ref) {
        const referencedPath = resolveReference(schemaPath, schema.$ref);
        if (referencedPath) {
            discoverDependencies(referencedPath, visited, dependencies);
        }
    }

    // Check for allOf in properties (nested schemas)
    if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
            if (propSchema.allOf && Array.isArray(propSchema.allOf)) {
                for (const item of propSchema.allOf) {
                    if (item.$ref) {
                        const referencedPath = resolveReference(schemaPath, item.$ref);
                        if (referencedPath) {
                            discoverDependencies(referencedPath, visited, dependencies);
                        }
                    }
                }
            }
        }
    }

    return dependencies;
}

// Discover all dependencies
const dependencies = discoverDependencies(rootSchemaPath);

if (dependencies.size === 0) {
    console.error(`Warning: No dependencies discovered for ${rootSchemaPath}`, 'stderr');
    process.exit(1);
}

// Convert to array and sort for consistent output
const sortedDeps = Array.from(dependencies).sort();

// Output each dependency on a new line (for easy consumption by make)
for (const dep of sortedDeps) {
    console.log(dep);
}
