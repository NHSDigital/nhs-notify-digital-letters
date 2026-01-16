#!/bin/bash

# This script is run before the Terraform apply command.
# It ensures all Node.js dependencies are installed, generates any required dependencies,
# and builds all Lambda functions in the workspace before Terraform provisions infrastructure.

npm ci

npm run generate-dependencies

npm run lambda-build --workspaces --if-present

# Build Python lambdas
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"

make -C "$ROOT/lambdas/mesh-acknowledge" package
make -C "$ROOT/lambdas/mesh-poll" package
make -C "$ROOT/lambdas/mesh-download" package
