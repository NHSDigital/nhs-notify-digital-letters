#!/bin/bash

set -euo pipefail

SRC_BASE_DIR=$1

echo "Installing documentation site dependencies..." && \
node --version && \
ruby --version && \
asdf current || "failed to get asdf current" && \
echo "ASDF data dir: $ASDF_DATA_DIR" && \
echo "PATH: $PATH" && \
whereis npm || echo "npm not found" && \
npm install && \
whereis gem || echo "gem not found" && \
gem install bundler && \
echo "ASDF data dir: $ASDF_DATA_DIR" && \
echo "PATH: $PATH" && \
echo "Looking for bundler:" && \
whereis bundler || echo "bundler not found" && \
bundler config set --local path vendor/bundle && \
bundler install && \
echo "Now installing src dependencies..." && \
make -C $SRC_BASE_DIR install
