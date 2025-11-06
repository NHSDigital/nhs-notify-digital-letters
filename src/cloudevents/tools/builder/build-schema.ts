#!/usr/bin/env ts-node

import { handleCli } from "./build-schema-cli.ts";

// Run the CLI handler
const result = handleCli(process.argv.slice(2));
process.exit(result.exitCode);
