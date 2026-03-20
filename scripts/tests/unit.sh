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

# Timing helpers — records wall-clock duration for each labelled step and prints
# a summary table at exit so it's easy to see where the time is going.
_timer_labels=()
_timer_seconds=()

run_timed() {
  local label="$1"
  shift
  local start
  start=$(date +%s)
  local rc=0
  "$@" || rc=$?
  local end
  end=$(date +%s)
  _timer_labels+=("$label")
  _timer_seconds+=("$((end - start))")
  return "$rc"
}

print_timing_summary() {
  echo ""
  echo "===== Timing Summary ====="
  local total=0
  for i in "${!_timer_labels[@]}"; do
    printf "  %-55s %4ds\n" "${_timer_labels[$i]}" "${_timer_seconds[$i]}"
    total=$((total + _timer_seconds[$i]))
  done
  echo "  ---------------------------------------------------------"
  printf "  %-55s %4ds\n" "TOTAL" "$total"
  echo "=========================="
}

trap print_timing_summary EXIT

# run tests

# TypeScript/JavaScript projects (npm workspace)
# Runs all Jest workspaces in parallel via the root jest.config.cjs projects
# config, which is faster than sequential `npm run test:unit --workspaces`.
# Note: src/cloudevents is included in the projects list in jest.config.cjs.
# Use || to capture any Jest failure so that Python tests always run; the exit
# code is propagated at the end of the script.
run_timed "npm ci" npm ci
run_timed "npm run generate-dependencies" npm run generate-dependencies
run_timed "npm run test:unit:parallel" npm run test:unit:parallel || jest_exit=$?

# Python projects - asyncapigenerator
echo "Setting up and running asyncapigenerator tests..."
run_timed "asyncapigenerator: install-dev" make -C ./src/asyncapigenerator install-dev
run_timed "asyncapigenerator: coverage" make -C ./src/asyncapigenerator coverage

# Python projects - cloudeventjekylldocs
echo "Setting up and running cloudeventjekylldocs tests..."
run_timed "cloudeventjekylldocs: install-dev" make -C ./src/cloudeventjekylldocs install-dev
run_timed "cloudeventjekylldocs: coverage" make -C ./src/cloudeventjekylldocs coverage

# Python projects - eventcatalogasyncapiimporter
echo "Setting up and running eventcatalogasyncapiimporter tests..."
run_timed "eventcatalogasyncapiimporter: install-dev" make -C ./src/eventcatalogasyncapiimporter install-dev
run_timed "eventcatalogasyncapiimporter: coverage" make -C ./src/eventcatalogasyncapiimporter coverage

# Python utility packages - py-utils
echo "Setting up and running py-utils tests..."
run_timed "py-utils: install-dev" make -C ./utils/py-utils install-dev
run_timed "py-utils: coverage" make -C ./utils/py-utils coverage

# Python projects - python-schema-generator
echo "Setting up and running python-schema-generator tests..."
run_timed "python-schema-generator: install-dev" make -C ./src/python-schema-generator install-dev
run_timed "python-schema-generator: coverage" make -C ./src/python-schema-generator coverage

# Python Lambda - mesh-acknowledge
echo "Setting up and running mesh-acknowledge tests..."
run_timed "mesh-acknowledge: install-dev" make -C ./lambdas/mesh-acknowledge install-dev
run_timed "mesh-acknowledge: coverage" make -C ./lambdas/mesh-acknowledge coverage

# Python Lambda - mesh-poll
echo "Setting up and running mesh-poll tests..."
run_timed "mesh-poll: install-dev" make -C ./lambdas/mesh-poll install-dev
run_timed "mesh-poll: coverage" make -C ./lambdas/mesh-poll coverage

# Python Lambda - mesh-download
echo "Setting up and running mesh-download tests..."
run_timed "mesh-download: install-dev" make -C ./lambdas/mesh-download install-dev
run_timed "mesh-download: coverage" make -C ./lambdas/mesh-download coverage

# Python Lambda - report-sender
echo "Setting up and running report-sender tests..."
run_timed "report-sender: install-dev" make -C ./lambdas/report-sender install-dev
run_timed "report-sender: coverage" make -C ./lambdas/report-sender coverage

# merge coverage reports
run_timed "lcov-result-merger" \
  bash -c 'mkdir -p .reports && TMPDIR="./.reports" ./node_modules/.bin/lcov-result-merger "**/.reports/unit/coverage/lcov.info" ".reports/lcov.info" --ignore "node_modules" --prepend-source-files --prepend-path-fix "../../.."'

# Propagate any Jest failure now that all other test suites have completed
if [ "${jest_exit:-0}" -ne 0 ]; then
  echo "Jest tests failed with exit code ${jest_exit}"
  exit "${jest_exit}"
fi
