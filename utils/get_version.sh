#!/usr/bin/env bash

if [ "${BASH_SOURCE[0]}" -ef "$0" ]
then
    echo "get_version.sh should be sourced not executed!"
    exit 1
fi

root_package_json="$(dirname ${BASH_SOURCE[0]})/../package.json"
version="$(jq -r ".version" "${root_package_json}")"
point_version="${version}"."${CI_PIPELINE_IID:-0}"
branch_and_version="${CI_COMMIT_REF_NAME:-$(git branch --show-current)}"_"${point_version}";

export point_version
export branch_and_version
