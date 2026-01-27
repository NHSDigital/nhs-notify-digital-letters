#!/usr/bin/env bash

if [[ "${BASH_SOURCE[0]}" -ef "$0" ]]; then
    echo "get_version.sh should be sourced, not executed!"
    exit 1
fi

root_package_json="$(dirname ${BASH_SOURCE[0]})/../package.json"
version="$(jq -r ".version" "${root_package_json}")"
POINT_VERSION="${version}"."${CI_PIPELINE_IID:-0}"
BRANCH_AND_VERSION="${CI_COMMIT_REF_NAME:-$(git branch --show-current)}"_"${POINT_VERSION}";

export POINT_VERSION
export BRANCH_AND_VERSION
