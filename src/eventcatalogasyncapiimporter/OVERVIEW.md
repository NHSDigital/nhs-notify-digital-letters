# EventCatalog AsyncAPI Importer

A Python tool that automatically imports AsyncAPI specifications into EventCatalog structure.

## 📋 Overview

This tool bridges the gap between AsyncAPI specifications and EventCatalog documentation by automatically generating:

- **Domains**: Logical groupings of related services
- **Services**: Individual microservices with their operations
- **Events**: Messages published or consumed by services
- **Channels**: Communication channels for event delivery

## 🚀 Quick Start

```bash
# Install dependencies
cd src/eventcatalogasyncapiimporter
make install

# Run the importer
make import-verbose

# Or use the Python script directly
python import_asyncapi.py --verbose

# Or use the convenience script
./run_importer.sh
```

## 📁 Project Structure

```text
src/eventcatalogasyncapiimporter/
├── import_asyncapi.py          # Main importer script
├── run_importer.sh             # Shell wrapper script
├── test_import_asyncapi.py     # Unit tests
├── examples.py                 # Usage examples
├── requirements.txt            # Python dependencies
├── config.sh.example           # Configuration template
├── Makefile                    # Make targets for common tasks
├── README.md                   # Comprehensive documentation
├── QUICKSTART.md              # Quick start guide
├── OVERVIEW.md                # This file
├── PROJECT_SUMMARY.md         # Detailed project info
├── CHECKLIST.md               # Step-by-step checklist
└── .gitignore                 # Git ignore rules
```

## 🔧 Features

- **Automatic Domain Classification**: Groups services by metadata or naming patterns
- **Event Type Detection**: Distinguishes between published and subscribed events
- **Channel Documentation**: Creates comprehensive channel references
- **Schema References**: Preserves links to CloudEvents and data schemas
- **Configurable Paths**: Supports custom input/output directories
- **Idempotent**: Safe to run multiple times (won't duplicate resources)
- **Verbose Logging**: Optional detailed output for debugging

## 📖 Documentation

- **[README.md](./README.md)**: Full documentation with all features and options
- **[QUICKSTART.md](./QUICKSTART.md)**: Step-by-step getting started guide
- **[config.sh.example](./config.sh.example)**: Configuration template

## 🎯 Usage Examples

### Using Makefile (Recommended)

```bash
# Quick start
make quick-import

# Regular import
make import

# Verbose output
make import-verbose

# Custom paths
make import-custom \
  ASYNCAPI_DIR=/custom/path \
  EVENTCATALOG_DIR=/custom/eventcatalog

# Show all commands
make help
```

### Basic Import

```bash
python import_asyncapi.py
```

### Custom Paths

```bash
python import_asyncapi.py \
  --asyncapi-dir /custom/path/to/asyncapi \
  --eventcatalog-dir /custom/path/to/eventcatalog \
  --verbose
```

### Using Configuration

```bash
# Create config from template
cp config.sh.example config.sh

# Edit configuration
nano config.sh

# Run with config
./run_importer.sh
```

### With Environment Variables

```bash
export VERBOSE="true"
export DOMAIN_NAME="Custom Domain"
./run_importer.sh
```

## 🔍 Output Example

The importer generates an EventCatalog structure like:

```text
eventcatalog/
├── domains/
│   ├── mesh-services/
│   │   ├── index.mdx
│   │   └── services/
│   │       ├── mesh-poller/
│   │       │   ├── index.mdx
│   │       │   └── events/
│   │       │       ├── mesh-inbox-message-received.mdx
│   │       │       └── mesh-poller-timer-expired.mdx
│   │       └── mesh-retriever/
│   │           └── ...
│   ├── pdm-services/
│   │   ├── index.mdx
│   │   └── services/
│   │       └── ...
│   └── core-services/
│       ├── index.mdx
│       └── services/
│           └── ...
└── channels/
    ├── uk-nhs-notify-digital-letters-mesh-inbox-message-received-v1.mdx
    └── ...
```

**Relationships**: The importer automatically creates links between resources in the frontmatter (domains → services, services → events).

## 🧪 Testing

Run the unit tests:

```bash
python test_import_asyncapi.py
```

Or with unittest:

```bash
python -m unittest test_import_asyncapi.py -v
```

## ⚙️ Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `--asyncapi-dir` | `src/asyncapigenerator/output` | AsyncAPI files directory |
| `--eventcatalog-dir` | `src/eventcatalog/digital-letters` | EventCatalog root directory |
| `--domain` | `Digital Letters` | Domain name for grouping |
| `--verbose` | `false` | Enable detailed logging |

## 🔄 Integration

After importing, start EventCatalog:

```bash
cd src/eventcatalog/digital-letters
npm install
npm run dev
```

Visit <http://localhost:3000> to view your documentation.

## 🛠️ Customization

### Domain Classification

Edit `extract_domain_from_service()` in `import_asyncapi.py`:

```python
def extract_domain_from_service(self, service_name: str, asyncapi_data: Dict[str, Any]) -> str:
    """Extract domain name from service metadata or name."""
    # Add custom logic here
    if "custom" in service_name.lower():
        return "Custom Domain"
    # ... existing logic
```

### Markdown Templates

Modify the template strings in:

- `create_domain_structure()` - Domain index files
- `create_service_structure()` - Service documentation
- `create_event_structure()` - Event documentation
- `create_channel_structure()` - Channel documentation

## 📝 Requirements

- Python 3.7+
- PyYAML 6.0+

## 🐛 Troubleshooting

### Common Issues

#### No AsyncAPI files found

- Check the path is correct
- Ensure files match `asyncapi-*.yaml` pattern

#### Permission errors

```bash
chmod -R u+w /path/to/eventcatalog
```

#### Import errors

```bash
python import_asyncapi.py --verbose
```

## 📜 License

Part of the NHS Notify Digital Letters project.

## 👥 Contributing

When modifying this tool:

1. Update tests in `test_import_asyncapi.py`
2. Run tests before committing
3. Update documentation as needed
4. Follow existing code style

## 🔗 Related Documentation

- [EventCatalog Documentation](https://www.eventcatalog.dev/docs)
- [AsyncAPI Specification](https://www.asyncapi.com/docs/specifications/v3.0.0)
- [CloudEvents Specification](https://cloudevents.io/)
