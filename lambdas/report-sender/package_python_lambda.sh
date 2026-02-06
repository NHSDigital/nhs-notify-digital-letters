#!/usr/bin/env bash
set -e

component_name="$1"

rootdir=$(realpath "$(dirname "$0")/../..")
source ${rootdir}/utils/get_version.sh

dist_dir="${PWD}/target/dist"
rm -rf "${dist_dir}"
mkdir -p "${dist_dir}"

# Extract internal (file://) and external dependencies from requirements.txt
grep -E '^-e ' requirements.txt | sed 's|^-e ||' > target/internal_requirements.txt || true
grep -vE '^-e ' requirements.txt > target/external_requirements.txt || true

# Install external dependencies (from PyPI)
pip install --platform manylinux2014_x86_64 --only-binary=:all: -r target/external_requirements.txt --target ${dist_dir} --python-version 3.14 --implementation cp

# Install internal dependencies (local packages)
pip install -r target/internal_requirements.txt --target ${dist_dir}

# Bundle application code
pip install . --no-deps --target ${dist_dir}
