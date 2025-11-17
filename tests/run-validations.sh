#!/bin/bash

# run-validations.sh
# Runs validation tests against multiple schemas
# Usage: run-validations.sh <base_dir> <data_file> <schema1> [schema2] [schema3] ...

# Parse arguments
BASE_DIR="$1"
DATA_FILE="$2"
shift 2

# Remaining arguments are schema paths
SCHEMAS=("$@")

# Extract a friendly name from schema path
get_schema_name() {
    local path="$1"
    # Get filename without path
    local filename=$(basename "$path")
    # Remove .schema.json extension
    local name="${filename%.schema.json}"
    echo "$name"
}

get_data_name() {
    local path="$1"
    # Get filename without path
    local filename=$(basename "$path")
    # Remove .schema.json extension
    local name="${filename%.json}"
    echo "$name"
}

data_file_name=$(get_data_name "$DATA_FILE")

echo ""
echo ""
echo "=== Running Validation Tests ==="
echo -e "Data File:\t $data_file_name"
echo -e "Data Path:\t $(basename "$DATA_FILE")"
echo ""
echo "Testing against:"
for schema_path in "${SCHEMAS[@]}"; do
    schema_name=$(get_schema_name "$schema_path")
    echo -e "Schema Name:\t $schema_name"
    echo -e "Schema Path:\t $schema_path"
done
echo ""
echo ""

failed=0
passed=0
total=${#SCHEMAS[@]}
index=1

# Array to store individual test results
test_results=()

for schema_path in "${SCHEMAS[@]}"; do
    schema_name=$(get_schema_name "$schema_path")

    echo "[$index/$total] Validating"
    echo -e "Schema Name:\t $schema_name"
    echo -e "Data Name:\t $data_file_name"
    echo -e "Schema Path:\t $schema_path"
    echo -e "Data Path:\t $DATA_FILE"

    echo ""

    # Capture the validation output
    validation_output=$(npm run validate -- --base "$BASE_DIR" "$schema_path" "$DATA_FILE" 2>&1)

    if echo "$validation_output" | grep -q "Valid!"; then
        echo "✅ PASS"
        test_results+=("PASS|$data_file_name|$schema_name")
        ((passed++))
    else
        echo "❌ FAIL"
        echo "Error Details:"
        # Show the actual error output
        echo "$validation_output" | grep -v "^>" | grep -v "^$" | head -50
        test_results+=("FAIL|$data_file_name|$schema_name")
        failed=1
    fi

    echo ""
    ((index++))
done

echo "========================================"
echo "Test Summary: $passed/$total passed"
if [ $failed -eq 0 ]; then
    echo "✅ All validations passed!"
else
    echo "❌ Some validations failed"
fi
echo "========================================"
echo ""

# Output machine-readable results for parent scripts
# Format: VALIDATION_RESULTS: passed total failed_flag
echo "VALIDATION_RESULTS: $passed $total $failed"

# Output individual test results
# Format: TEST_RESULT: status|event_name|schema_name
for result in "${test_results[@]}"; do
    echo "TEST_RESULT: $result"
done

exit $failed
