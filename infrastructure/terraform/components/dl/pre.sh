#!/bin/bash

# This script is run before the Terraform apply command.
# It ensures all Node.js dependencies are installed, generates any required dependencies,
# and builds all Lambda functions in the workspace before Terraform provisions infrastructure.

echo "Running pre-terraform script..."
echo "Current directory: $(pwd)"
echo "Listing files in current directory:"
ls -la

npm ci

make generate

npm run lambda-build --workspaces --if-present
