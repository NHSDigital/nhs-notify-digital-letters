# AsyncAPI to EventCatalog Importer

This tool imports AsyncAPI specifications into an EventCatalog structure, creating domains, services, channels, and events automatically.

## Overview

The importer reads AsyncAPI yaml files and generates the appropriate EventCatalog directory structure with markdown files for:

- **Domains**: Logical groupings of services (e.g., MESH Services, PDM Services)
- **Services**: Individual microservices defined in AsyncAPI specs
- **Events**: Messages published or consumed by services
- **Channels**: Communication channels used for event delivery

## Installation

### Prerequisites

- Python 3.7 or higher
- pip (Python package manager)
- make (optional, for using Makefile targets)

### Install Dependencies

```bash
cd src/eventcatalogasyncapiimporter
pip install -r requirements.txt
```

Or using the Makefile:

```bash
make install
```

For development and testing:

```bash
make install-dev
```

## Usage

### Using Makefile (Recommended)

The easiest way to use the importer is with the included Makefile:

```bash
# Quick start - install and import
make quick-import

# Just import with default settings
make import

# Import with verbose output
make import-verbose

# Show available commands
make help
```

### Basic Usage (Python Script)

Run with default paths:

```bash
python import_asyncapi.py
```

This will:

- Read AsyncAPI files from `../../asyncapigenerator/output/`
- Generate EventCatalog structure in `../../eventcatalog/digital-letters/`

### Custom Paths

Using Makefile:

```bash
make import-custom ASYNCAPI_DIR=/path/to/asyncapi EVENTCATALOG_DIR=/path/to/eventcatalog
```

Or with Python script:

```bash
python import_asyncapi.py \
  --asyncapi-dir /path/to/asyncapi/output \
  --eventcatalog-dir /path/to/eventcatalog
```

### Verbose Output

Using Makefile:

```bash
make import-verbose
```

Or with Python script:

```bash
python import_asyncapi.py --verbose
```

### Custom Domain Name

Using Makefile:

```bash
make import DOMAIN_NAME="My Custom Domain"
```

Or with Python script:

```bash
python import_asyncapi.py --domain "My Custom Domain"
```

### All Options

Using Makefile:

```bash
make import-custom \
  ASYNCAPI_DIR=./src/asyncapigenerator/output \
  EVENTCATALOG_DIR=./src/eventcatalog/digital-letters \
  DOMAIN_NAME="Digital Letters"
```

Or with Python script:

```bash
python import_asyncapi.py \
  --asyncapi-dir ./src/asyncapigenerator/output \
  --eventcatalog-dir ./src/eventcatalog/digital-letters \
  --domain "Digital Letters" \
  --schema-base-path /path/to/repo/root \
  --verbose
```

### Schema File Copying

To enable schema file copying to event directories:

```bash
python import_asyncapi.py \
  --schema-base-path /home/user/nhs-notify-digital-letters
```

This will:

- Copy schema files from `<schema-base-path>/schemas/...` to event directories
- Update event pages to use `<Schema>` and `<SchemaViewer>` components with just the filename
- Only copy schemas that match the `https://notify.nhs.uk/cloudevents` URL pattern
- External schemas (e.g., from `nhsdigital.github.io`) are not copied

## Makefile Targets

The Makefile provides convenient commands for common tasks:

### Installation

- `make install` - Install Python dependencies
- `make install-dev` - Install development dependencies
- `make setup` - Initial setup (same as install)

### Import Operations

- `make import` - Run importer with default settings
- `make import-verbose` - Run with verbose output
- `make import-custom` - Run with custom paths (use variables)
- `make quick-import` - Install and import in one command
- `make dry-run` - List AsyncAPI files to be processed

### Testing

- `make test` - Run unit tests
- `make test-quick` - Run tests without verbose output
- `make check` - Run linting and tests

### Development

- `make examples` - Run examples script
- `make lint` - Run code linting
- `make format` - Format code with black

### Utilities

- `make clean` - Clean Python cache files
- `make info` - Show configuration information
- `make docs` - List documentation files
- `make help` - Show all available targets

### Complete Workflows

- `make all` - Setup, test, and import
- `make ci` - CI/CD target (install and test)
- `make full-check` - Install dev deps, lint, and test

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--asyncapi-dir` | Directory containing AsyncAPI yaml files | `src/asyncapigenerator/output` |
| `--eventcatalog-dir` | EventCatalog root directory | `src/eventcatalog/digital-letters` |
| `--domain` | Name of the domain to create | `Digital Letters` |
| `--schema-base-path` | Base path for schema files on local filesystem | None (schemas not copied) |
| `--verbose`, `-v` | Enable verbose logging | `False` |
| `--help`, `-h` | Show help message | - |

## Generated Structure

The tool creates the following EventCatalog structure:

```text
eventcatalog/
├── domains/
│   ├── mesh-services/
│   │   ├── index.mdx
│   │   └── services/
│   │       ├── mesh-poller/
│   │       │   ├── index.mdx
│   │       │   └── events/
│   │       │       ├── mesh-inbox-message-received/
│   │       │       │   └── index.mdx
│   │       │       └── mesh-poller-timer-expired/
│   │       │           └── index.mdx
│   │       └── mesh-retriever/
│   │           ├── index.mdx
│   │           └── events/
│   │               └── ...
│   ├── pdm-services/
│   │   ├── index.mdx
│   │   └── services/
│   │       └── ...
│   └── core-services/
│       ├── index.mdx
│       └── services/
│           └── ...
└── channels/
    ├── uk-nhs-notify-digital-letters-mesh-inbox-message-received-v1/
    │   └── index.mdx
    └── ...
```

**Note**: The importer automatically creates relationships between resources:

- Domain frontmatter includes a `services:` list linking to services within that domain
- Service frontmatter includes `receives:` and `sends:` lists linking to events the service interacts with

## How It Works

1. **Scan AsyncAPI Files**: Finds all `asyncapi-*.yaml` files in the source directory
2. **Extract Metadata**: Parses service names, domains, and message definitions
3. **Create Domains**: Organizes services into logical domains based on naming or metadata
4. **Generate Services**: Creates service directories with index files
5. **Create Events**: Generates event markdown files for published/received messages
6. **Create Channels**: Documents the communication channels used

## Domain Classification

Services are automatically classified into domains based on:

1. **Metadata**: `x-service-metadata.parent` field in AsyncAPI
2. **Service Name**: Pattern matching on service names:
   - Names containing "mesh" → MESH Services
   - Names containing "pdm" → PDM Services
   - Names containing "reporting" → Reporting
   - Others → Core Services

## Event Types

Events are classified as:

- **Published** (sent): When `operation.action` is `send`
- **Received** (subscribed): When `operation.action` is `receive`

## Customization

### Modifying Domain Classification

Edit the `extract_domain_from_service()` method in `import_asyncapi.py` to customize how services are grouped into domains.

### Customizing Output Format

The markdown templates for domains, services, events, and channels can be modified in their respective `create_*_structure()` methods.

## Troubleshooting

### No AsyncAPI files found

Ensure your AsyncAPI files:

- Are in the correct directory
- Follow the naming pattern `asyncapi-*.yaml`
- Are valid YAML files

### Permission errors

Ensure you have write permissions to the EventCatalog directory:

```bash
chmod -R u+w /path/to/eventcatalog
```

### Import issues

Use `--verbose` flag to see detailed logging:

```bash
python import_asyncapi.py --verbose
```

## Integration with EventCatalog

After running the importer:

1. Navigate to your EventCatalog directory:

   ```bash
   cd src/eventcatalog/digital-letters
   ```

2. Install dependencies (if not already done):

   ```bash
   npm install
   ```

3. Start EventCatalog:

   ```bash
   npm run dev
   ```

4. View your catalog at `http://localhost:3000`

## Example Output

Running the importer will produce output like:

```text
[INFO] Found 24 AsyncAPI files to process

[INFO] Processing: asyncapi-mesh-poller.yaml
[INFO] Created domain: MESH Services
[INFO] Created service: MESH Poller
[INFO] Created channel: uk_nhs_notify_digital_letters_mesh_inbox_message_received_v1
[INFO] Created event: MESHInboxMessageReceived (published)
[INFO] Created event: MeshPollerTimerExpired (received)

...

============================================================
Import Summary:
  Services created: 20
  Events created: 45
  Channels created: 38
============================================================

✅ Import completed successfully!
```

## License

This tool is part of the NHS Notify Digital Letters project.
