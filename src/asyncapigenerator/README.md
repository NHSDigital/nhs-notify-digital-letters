# AsyncAPI Generator

This tool generates AsyncAPI specifications from NHS Notify Digital Letters event definitions and service architecture.

## Overview

The AsyncAPI generator reads from:

- **Events**: `docs/collections/_events/*.md` - Event definitions with metadata
- **Services**: `docs/architecture/c4/notifhir/` - Service/system definitions with event relationships
- **Schemas**: `schemas/digital-letters/` - JSON Schema definitions for event payloads

And produces AsyncAPI 3.0 specifications that document the event-driven architecture.

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### Generate AsyncAPI for all services

```bash
python generate_asyncapi.py
```

### Generate AsyncAPI for a specific service

```bash
python generate_asyncapi.py --service "MESH Services"
```

### Custom paths

```bash
python generate_asyncapi.py \
  --events-dir /path/to/events \
  --services-dir /path/to/services \
  --schemas-dir /path/to/schemas \
  --output-dir /path/to/output
```

### Configuration

You can also use a configuration file:

```bash
python generate_asyncapi.py --config config.yaml
```

See `config.example.yaml` for configuration options.

## Output

The generator creates:

- One AsyncAPI specification per service in the output directory
- A combined `asyncapi-all.yaml` with all services
- Schema references pointing to your actual JSON Schema files

## AsyncAPI Format

The tool generates AsyncAPI 3.0 specifications with:

- **Channels**: One channel per event type
- **Operations**: Send (for events-raised) and Receive (for events-consumed)
- **Messages**: Linked to CloudEvents schemas
- **Components**: Reusable schema references

## Development

Run tests:

```bash
pytest
```

Format code:

```bash
black .
```

Lint:

```bash
pylint *.py
```
