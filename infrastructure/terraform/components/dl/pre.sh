#!/bin/bash

# This script is run before the Terraform apply command.
# It ensures all Node.js dependencies are installed, generates any required dependencies,
# and builds all Lambda functions in the workspace before Terraform provisions infrastructure.

npm ci

npm run generate-dependencies

npm run lambda-build --workspaces --if-present

# Build Python lambdas
make -C lambdas/mesh-poll package
make -C lambdas/mesh-download package
