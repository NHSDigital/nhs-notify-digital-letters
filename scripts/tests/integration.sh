#!/bin/bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

npm install
npx playwright install --with-deps > /dev/null

cd tests/playwright

case "${INTEGRATION_MODE:-run}" in
  setup)
    npm run test:component:setup
    ;;
  teardown)
    npm run test:component:teardown
    ;;
  run)
    npm run test:component -- ${PLAYWRIGHT_SHARD:+--shard="$PLAYWRIGHT_SHARD"}
    ;;
  *)
    echo "[ERROR] Unknown INTEGRATION_MODE: ${INTEGRATION_MODE}" >&2
    exit 1
    ;;
esac
