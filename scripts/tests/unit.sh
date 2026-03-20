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

# Python projects - run all install-dev steps sequentially (they share the same
# pip environment so cannot be parallelised), then run all coverage (pytest)
# steps in parallel since each writes to its own isolated output directory.

# ---- Phase 1: install all Python dev dependencies (sequential, shared pip env) ----
echo "Installing Python dev dependencies..."
_python_projects=(
  ./src/asyncapigenerator
  ./src/cloudeventjekylldocs
  ./src/eventcatalogasyncapiimporter
  ./utils/py-utils
  ./src/python-schema-generator
  ./lambdas/mesh-acknowledge
  ./lambdas/mesh-poll
  ./lambdas/mesh-download
  ./lambdas/report-sender
)
for proj in "${_python_projects[@]}"; do
  run_timed "${proj}: install-dev" make -C "$proj" install-dev
done

# ---- Phase 2: run all coverage steps in parallel ----
# Each job writes output to a temp file; we print them sequentially on
# completion so the log is readable. Non-zero exit codes are all collected and
# the script fails at the end if any job failed.
echo "Running Python coverage in parallel..."

_py_pids=()
_py_labels=()
_py_logs=()
_py_exits=()

for proj in "${_python_projects[@]}"; do
  label="${proj}: coverage"
  logfile=$(mktemp)
  make -C "$proj" coverage >"$logfile" 2>&1 &
  _py_pids+=("$!")
  _py_labels+=("$label")
  _py_logs+=("$logfile")
done

# Collect results in launch order (preserves deterministic output)
_py_start=$(date +%s)
for i in "${!_py_pids[@]}"; do
  wait "${_py_pids[$i]}"
  _py_exits+=("$?")
  echo ""
  echo "--- ${_py_labels[$i]} ---"
  cat "${_py_logs[$i]}"
  rm -f "${_py_logs[$i]}"
done
_py_end=$(date +%s)
_timer_labels+=("Python coverage (parallel)")
_timer_seconds+=("$((_py_end - _py_start))")

# merge coverage reports
run_timed "lcov-result-merger" \
  bash -c 'mkdir -p .reports && TMPDIR="./.reports" ./node_modules/.bin/lcov-result-merger "**/.reports/unit/coverage/lcov.info" ".reports/lcov.info" --ignore "node_modules" --prepend-source-files --prepend-path-fix "../../.."'

# Propagate any Jest failure now that all other test suites have completed
if [ "${jest_exit:-0}" -ne 0 ]; then
  echo "Jest tests failed with exit code ${jest_exit}"
  exit "${jest_exit}"
fi

# Propagate any Python coverage failure
for i in "${!_py_exits[@]}"; do
  if [ "${_py_exits[$i]}" -ne 0 ]; then
    echo "${_py_labels[$i]} failed with exit code ${_py_exits[$i]}"
    exit "${_py_exits[$i]}"
  fi
done
