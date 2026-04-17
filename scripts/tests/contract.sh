#!/usr/bin/env bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if [[ $(npm outdated @nhsdigital/nhs-notify-event-schemas-status-published) ]]; then
    echo "The provider schema package (@nhsdigital/nhs-notify-event-schemas-status-published) is outdated."
    echo "Please run \`npm update @nhsdigital/nhs-notify-event-schemas-status-published\` to update to the latest version and re-run."
    echo
    exit 1
fi

npm run test:contract
