# Quick Start Guide

## Prerequisites

- Python 3.7 or higher
- pip (Python package manager)

## Installation

1. Navigate to the importer directory:

   ```bash
   cd src/eventcatalogasyncapiimporter
   ```

2. Install dependencies:

   Using Makefile (recommended):

   ```bash
   make install
   ```

   Or using pip directly:

   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Option 1: Using Makefile (Recommended)

The quickest way to get started:

```bash
# Quick start - install and import in one command
make quick-import

# Or just import if already installed
make import

# Import with verbose output
make import-verbose

# Show all available commands
make help
```

### Option 2: Using the Python Script Directly

Run with default settings:

```bash
python import_asyncapi.py
```

Run with custom paths:

Using Makefile:

```bash
make import-custom \
  ASYNCAPI_DIR=../../asyncapigenerator/output \
  EVENTCATALOG_DIR=../../eventcatalog/digital-letters
```

Or with Python:

```bash
python import_asyncapi.py \
  --asyncapi-dir ../../asyncapigenerator/output \
  --eventcatalog-dir ../../eventcatalog/digital-letters \
  --verbose
```

### Option 3: Using the Shell Script

The shell script provides a convenient wrapper:

```bash
./run_importer.sh
```

With verbose output:

```bash
VERBOSE=true ./run_importer.sh
```

With custom configuration:

```bash
# Copy and edit the config file
cp config.sh.example config.sh
nano config.sh

# Run with config
./run_importer.sh
```

### Option 4: Environment Variables

You can also set environment variables:

```bash
export ASYNCAPI_DIR="src/asyncapigenerator/output"
export EVENTCATALOG_DIR="src/eventcatalog/digital-letters"
export VERBOSE="true"

./run_importer.sh
# or
make import
```

## What Happens

The importer will:

1. Scan for AsyncAPI yaml files in the source directory
2. Parse each file to extract services, events, and channels
3. Create the EventCatalog directory structure:
   - Domains (logical groupings)
   - Services (within domains)
   - Events (within services)
   - Channels (at the root level)
4. Generate markdown files for each resource
5. Display a summary of created resources

## Example Output

```text
[INFO] Found 24 AsyncAPI files to process

[INFO] Processing: asyncapi-mesh-poller.yaml
[INFO] Created domain: MESH Services
[INFO] Created service: MESH Poller
[INFO] Created channel: uk_nhs_notify_digital_letters_mesh_inbox_message_received_v1
[INFO] Created event: MESHInboxMessageReceived (published)

============================================================
Import Summary:
  Services created: 20
  Events created: 45
  Channels created: 38
============================================================

✅ Import completed successfully!
```

## Viewing the Results

After import, view your EventCatalog:

```bash
cd ../../eventcatalog/digital-letters
npm install
npm run dev
```

Then open <http://localhost:3000> in your browser.

## Troubleshooting

### Python not found

Install Python 3:

```bash
# Ubuntu/Debian
sudo apt-get install python3 python3-pip

# macOS
brew install python3
```

### PyYAML not found

Install the requirements:

```bash
pip install -r requirements.txt
```

### Permission denied

Make the script executable:

```bash
chmod +x run_importer.sh
```

### No AsyncAPI files found

Check that:

- Your AsyncAPI files are in the correct directory
- Files are named with the pattern `asyncapi-*.yaml`
- You're running from the correct directory

## Next Steps

- Customize the domain classification logic in `import_asyncapi.py`
- Modify the markdown templates for custom formatting
- Add additional metadata extraction from AsyncAPI specs
- Integrate with CI/CD for automatic updates
