#!/bin/bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

./scripts/set-github-token.sh
npm ci
npm run generate-dependencies
npm run lint
