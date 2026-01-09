#!/bin/bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# This file is for you! Edit it to call your unit test suite. Note that the same
# file will be called if you run it locally as if you run it on CI.

# Replace the following line with something like:
#
#   rails test:unit
#   python manage.py test
#   npm run test
#
# or whatever is appropriate to your project. You should *only* run your fast
# tests from here. If you want to run other test suites, see the predefined
# tasks in scripts/test.mk.

# run tests

# TypeScript/JavaScript projects (npm workspace)
# Note: src/cloudevents is included in workspaces, so it will be tested here
npm ci
npm run generate-dependencies
npm run test:unit --workspaces

# Python projects - asyncapigenerator
echo "Setting up and running asyncapigenerator tests..."
make -C ./src/asyncapigenerator install-dev
make -C ./src/asyncapigenerator coverage  # Run with coverage to generate coverage.xml for SonarCloud

# Python projects - cloudeventjekylldocs
echo "Setting up and running cloudeventjekylldocs tests..."
make -C ./src/cloudeventjekylldocs install-dev
make -C ./src/cloudeventjekylldocs coverage  # Run with coverage to generate coverage.xml for SonarCloud

# Python projects - eventcatalogasyncapiimporter
echo "Setting up and running eventcatalogasyncapiimporter tests..."
make -C ./src/eventcatalogasyncapiimporter install-dev
make -C ./src/eventcatalogasyncapiimporter coverage  # Run with coverage to generate coverage.xml for SonarCloud

# Python utility packages - event-publisher-py
echo "Setting up and running event-publisher-py tests..."
make -C ./utils/event-publisher-py install-dev
make -C ./utils/event-publisher-py coverage  # Run with coverage to generate coverage.xml for SonarCloud

# Python utility packages - metric-publishers
echo "Setting up and running metric-publishers tests..."
make -C ./utils/metric-publishers install-dev
make -C ./utils/metric-publishers coverage  # Run with coverage to generate coverage.xml for SonarCloud

# Python utility packages - sender-management
echo "Setting up and running Python sender-management tests..."
make -C ./utils/sender-management install-dev
make -C ./utils/sender-management coverage  # Run with coverage to generate coverage.xml for SonarCloud

# Python Lambda - mesh-acknowledge
echo "Setting up and running mesh-acknowledge tests..."
make -C ./lambdas/mesh-acknowledge install-dev
make -C ./lambdas/mesh-acknowledge coverage  # Run with coverage to generate coverage.xml for SonarCloud

# Python projects - python-schema-generator
echo "Setting up and running python-schema-generator tests..."
make -C ./src/python-schema-generator install-dev
make -C ./src/python-schema-generator coverage  # Run with coverage to generate coverage.xml for SonarCloud

# merge coverage reports
mkdir -p .reports
TMPDIR="./.reports" ./node_modules/.bin/lcov-result-merger "**/.reports/unit/coverage/lcov.info" ".reports/lcov.info" --ignore "node_modules" --prepend-source-files --prepend-path-fix "../../.."
