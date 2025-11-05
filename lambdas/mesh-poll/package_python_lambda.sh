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

# poetry config virtualenvs.in-project true

# this asserts we are using the right pip+python
poetry install --only-root
source .venv/bin/activate

# now bundle dependencies from lock file
poetry export -f requirements.txt --output target/all_requirements.txt --without dev
grep -v file:// target/all_requirements.txt > target/external_requirements.txt
grep file:// target/all_requirements.txt > target/internal_requirements.txt
pip install --platform manylinux2014_x86_64 --only-binary=:all: -r target/external_requirements.txt --target ${build_dir} --no-deps
pip install -r target/internal_requirements.txt --target ${build_dir} --no-deps

# now bundle application code
pip install . --no-deps --target ${build_dir}

# and construct the build artefact
cd ${build_dir} && zip -r "${dist_dir}/${VERSIONED_ZIP_NAME}" .
