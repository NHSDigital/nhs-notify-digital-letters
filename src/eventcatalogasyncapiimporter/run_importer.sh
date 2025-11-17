#!/usr/bin/env bash
#
# Helper script to run the AsyncAPI to EventCatalog importer
#

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source config if it exists
CONFIG_FILE="$SCRIPT_DIR/config.sh"
if [ -f "$CONFIG_FILE" ]; then
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"
fi

# Default values
ASYNCAPI_DIR="${ASYNCAPI_DIR:-src/asyncapigenerator/output}"
EVENTCATALOG_DIR="${EVENTCATALOG_DIR:-src/eventcatalog/digital-letters}"
DOMAIN_NAME="${DOMAIN_NAME:-Digital Letters}"
VERBOSE="${VERBOSE:-false}"

# Build paths
ASYNCAPI_PATH="$REPO_ROOT/$ASYNCAPI_DIR"
EVENTCATALOG_PATH="$REPO_ROOT/$EVENTCATALOG_DIR"

# Check Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is required but not found"
    exit 1
fi

# Check if requirements are installed
if ! python3 -c "import yaml" 2>/dev/null; then
    echo "Installing requirements..."
    pip install -r "$SCRIPT_DIR/requirements.txt"
fi

# Build command
CMD="python3 $SCRIPT_DIR/import_asyncapi.py"
CMD="$CMD --asyncapi-dir \"$ASYNCAPI_PATH\""
CMD="$CMD --eventcatalog-dir \"$EVENTCATALOG_PATH\""
CMD="$CMD --domain \"$DOMAIN_NAME\""

if [ "$VERBOSE" = "true" ]; then
    CMD="$CMD --verbose"
fi

# Add any additional arguments passed to this script
if [ $# -gt 0 ]; then
    CMD="$CMD $*"
fi

# Run the importer
echo "Running AsyncAPI to EventCatalog importer..."
echo "  AsyncAPI dir: $ASYNCAPI_PATH"
echo "  EventCatalog dir: $EVENTCATALOG_PATH"
echo ""

eval "$CMD"
