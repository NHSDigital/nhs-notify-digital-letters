/**
 * Validator Library - Extracted testable functions from validate.js
 *
 * This module exports testable functions extracted from the validate.js CLI script
 * to enable unit testing with code coverage collection.
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

/**
 * Find all schema files (.json, .schema.json, .yaml, .yml) in a directory recursively
 * @param {string} dir - Directory to search
 * @returns {string[]} Array of absolute file paths to schema files
 */
export function findAllSchemaFiles(dir) {
  let results = [];

  // Check if directory exists
  if (!fs.existsSync(dir)) {
    return results;
  }

  try {
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
  } catch (error) {
    // Return empty results if directory can't be read
    return results;
  }

  return results;
}

/**
 * Load and parse a schema file (JSON or YAML)
 * @param {string} filePath - Path to schema file
 * @returns {object|null} Parsed schema object or null if invalid
 */
export function loadSchemaFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
      return yaml.load(fileContent);
    } else {
      return JSON.parse(fileContent);
    }
  } catch (e) {
    return null;
  }
}

/**
 * Validate NHS Number format and checksum
 * @param {string} nhsNumber - NHS Number to validate (can include spaces)
 * @returns {boolean} True if valid NHS Number
 */
export function validateNhsNumber(nhsNumber) {
  if (typeof nhsNumber !== "string") return false;

  // Remove spaces and validate format
  const digits = nhsNumber.replace(/\s+/g, "");
  if (!/^\d{10}$/.test(digits)) return false;

  // Calculate checksum
  const nums = digits.split("").map((d) => parseInt(d, 10));
  const check = nums[9];
  const sum = nums.slice(0, 9).reduce((acc, d, i) => acc + d * (10 - i), 0);
  const remainder = sum % 11;
  const expected = 11 - remainder === 11 ? 0 : 11 - remainder;

  // Check digit of 10 is invalid
  if (expected === 10) return false;

  return check === expected;
}

/**
 * Diagnose NHS Number validation issues with detailed error information
 * @param {any} raw - Value to diagnose (typically a string)
 * @returns {object} Diagnosis object with valid flag, reason, and details
 */
export function diagnoseNhsNumber(raw) {
  const original = raw;

  if (typeof raw !== "string") {
    return { valid: false, reason: "Value is not a string", original };
  }

  const digits = raw.replace(/\s+/g, "");
  if (!/^\d{10}$/.test(digits)) {
    return {
      valid: false,
      reason: "Must contain exactly 10 digits (spaces optional for readability)",
      original,
    };
  }

  const nums = digits.split("").map((d) => parseInt(d, 10));
  const providedCheck = nums[9];
  const sum = nums.slice(0, 9).reduce((acc, d, i) => acc + d * (10 - i), 0);
  const remainder = sum % 11;
  let expected = 11 - remainder;
  if (expected === 11) expected = 0; // 11 -> 0 per algorithm

  if (expected === 10) {
    return {
      valid: false,
      reason: "Computed check digit is 10 (reserved = invalid number)",
      expectedCheck: expected,
      providedCheck,
      original,
    };
  }

  if (providedCheck !== expected) {
    return {
      valid: false,
      reason: "Checksum mismatch",
      expectedCheck: expected,
      providedCheck,
      original,
    };
  }

  return {
    valid: true,
    reason: "OK",
    expectedCheck: expected,
    providedCheck,
    original,
  };
}

/**
 * Determine the schema directory by walking up from a given path
 * @param {string} startPath - Starting path (typically schema file path)
 * @returns {string} Determined schema directory
 */
export function determineSchemaDir(startPath) {
  let schemaDir = path.dirname(startPath);

  // Walk up to find 'src' or 'output' directory
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

  // If we didn't find 'src' or 'output', fall back to the original directory
  if (
    path.basename(schemaDir) !== "src" &&
    path.basename(schemaDir) !== "output"
  ) {
    schemaDir = path.dirname(startPath);
  }

  return schemaDir;
}

/**
 * Parse command line arguments for the validator
 * @param {string[]} args - Command line arguments (typically process.argv.slice(2))
 * @returns {object} Parsed arguments with schemaPath, dataPath, and optional baseDir
 */
export function parseCliArgs(args) {
  let schemaPath = null;
  let dataPath = null;
  let baseDir = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base" && i + 1 < args.length) {
      baseDir = args[i + 1];
      i++; // skip the next argument
    } else if (!schemaPath) {
      schemaPath = args[i];
    } else if (!dataPath) {
      dataPath = args[i];
    }
  }

  return { schemaPath, dataPath, baseDir };
}

/**
 * Check if a file is a schema file based on extension
 * @param {string} filename - File name or path
 * @returns {boolean} True if file is a schema file
 */
export function isSchemaFile(filename) {
  return (
    filename.endsWith(".json") ||
    filename.endsWith(".schema.json") ||
    filename.endsWith(".yaml") ||
    filename.endsWith(".yml")
  );
}
