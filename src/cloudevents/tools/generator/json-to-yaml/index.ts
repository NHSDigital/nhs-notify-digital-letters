#!/usr/bin/env ts-node
/**
 * Entry point for json-to-yaml CLI tool
 * This file runs the CLI handler when executed directly
 */

import { handleCli } from './json-to-yaml-cli.ts';

const exitCode = handleCli(process.argv.slice(2));
process.exit(exitCode);
