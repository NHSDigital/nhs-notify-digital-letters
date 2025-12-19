#!/usr/bin/env bash
set -e

component_name="$1"

rootdir=$(realpath "$(dirname "$0")/../..")
source ${rootdir}/utils/get_version.sh

VERSIONED_ZIP_NAME="NHSD.comms."${component_name}-"${point_version}"".zip"

dist_dir="${PWD}/target/dist"
build_dir="${PWD}/target/python-build"
mkdir -p "${dist_dir}"
rm -rf "${build_dir}"
mkdir -p "${build_dir}"
rm -rf "${dist_dir}/${VERSIONED_ZIP_NAME}"

# Extract internal (file://) and external dependencies from requirements.txt
grep -E '^-e ' requirements.txt | sed 's|^-e ||' > target/internal_requirements.txt || true
grep -vE '^-e ' requirements.txt > target/external_requirements.txt || true

# Install external dependencies (from PyPI)
pip install --platform manylinux2014_x86_64 --only-binary=:all: -r target/external_requirements.txt --target ${build_dir} --python-version 3.13 --implementation cp

# Install internal dependencies (local packages)
pip install -r target/internal_requirements.txt --target ${build_dir}

# Bundle application code
pip install . --no-deps --target ${build_dir}

# Construct the build artefact
cd ${build_dir} && zip -r "${dist_dir}/${VERSIONED_ZIP_NAME}" .
