#!/usr/bin/env bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Ensure we have the latest schema package matching our version specifier
npm update @nhsdigital/nhs-notify-event-schemas-status-published

npm run test:contract
