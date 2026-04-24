#!/bin/bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

npm install
npx playwright install --with-deps > /dev/null

cd tests/playwright

# When sharding, shards 2+ must wait for shard 1 to complete setup
# (purge queues, alter firehose buffers) before running tests.
# Shard 1 setup typically takes ~30s.
if [[ -n "${PLAYWRIGHT_SHARD:-}" && ! "${PLAYWRIGHT_SHARD}" == 1/* ]]; then
  echo "Shard ${PLAYWRIGHT_SHARD}: waiting 30s for shard 1 setup to complete..."
  sleep 30
fi

npm run test:component -- ${PLAYWRIGHT_SHARD:+--shard="$PLAYWRIGHT_SHARD"}
