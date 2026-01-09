#!/bin/bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

./scripts/set-github-token.sh
npm ci
npx playwright install --with-deps > /dev/null

cd tests/playwright

npm run test:component
