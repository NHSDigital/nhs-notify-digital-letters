# AsyncAPI Generator - Quick Start

## Installation

1. **Navigate to the generator directory:**

   ```bash
   cd src/asyncapigenerator
   ```

2. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   # or
   make install
   ```

## Usage

### Generate AsyncAPI for all services

```bash
python generate_asyncapi.py
# or
make generate
```

This will create AsyncAPI specifications in `./output/`:

- `asyncapi-all.yaml` - Combined spec for all services
- `asyncapi-{service-name}.yaml` - Individual specs per service

### Generate for a specific service

```bash
python generate_asyncapi.py --service "MESH Poller"
# or
make generate-service SERVICE="MESH Poller"
```

### Custom paths

```bash
python generate_asyncapi.py \
  --events-dir /path/to/events \
  --services-dir /path/to/services \
  --output-dir /path/to/output
```

### Using a config file

```bash
python generate_asyncapi.py --config my-config.yaml
```

## View the Results

### Option 1: AsyncAPI Studio (Online)

1. Go to <https://studio.asyncapi.com/>
2. Click "Import" → "From File"
3. Select any generated `.yaml` file

### Option 2: AsyncAPI CLI (Local)

```bash
# Install AsyncAPI CLI
npm install -g @asyncapi/cli

# Validate
asyncapi validate output/asyncapi-mesh-poller.yaml

# Generate HTML documentation
asyncapi generate fromTemplate output/asyncapi-mesh-poller.yaml @asyncapi/html-template -o docs/asyncapi-html
```

### Option 3: VS Code Extension

1. Install "AsyncAPI Preview" extension
2. Open any generated `.yaml` file
3. Click the preview icon

## Understanding the Output

### Per-Service AsyncAPI

Each service gets its own AsyncAPI file with:

```yaml
asyncapi: 3.0.0
info:
  title: NHS Notify Digital Letters - MESH Poller
  version: 2025-10-draft
  x-service-metadata:
    owner: Tom D'Roza
    c4type: code

channels:
  uk_nhs_notify_digital_letters_mesh_inbox_message_received_v1:
    address: uk/nhs/notify/digital/letters/mesh/inbox/message/received/v1
    messages:
      MESHInboxMessageReceived:
        contentType: application/cloudevents+json
        payload:
          $ref: https://...schema.json

operations:
  send_uk_nhs_notify_digital_letters_mesh_inbox_message_received_v1:
    action: send
    channel:
      $ref: '#/channels/...'
    summary: Send MESHInboxMessageReceived
```

### Combined AsyncAPI

The `asyncapi-all.yaml` contains:

- All unique event channels
- All operations from all services
- Complete event-driven architecture view

## Common Tasks

### Update AsyncAPI specs after changing events

```bash
cd src/asyncapigenerator
make generate
```

### Clean generated files

```bash
make clean
```

### Run tests

```bash
python test_generator.py
```

### Customize generation

Edit `config.yaml` to change:

- Source paths
- Output directory
- AsyncAPI metadata
- Generation options

## Next Steps

1. **Integrate with CI/CD**: Add AsyncAPI validation to your build pipeline
2. **Generate Code**: Use AsyncAPI codegen to create TypeScript/Python clients
3. **Documentation**: Generate HTML docs or use AsyncAPI Studio
4. **Contract Testing**: Validate events against AsyncAPI specs

## Troubleshooting

### "Event X not found for service Y"

This warning means a service references an event that doesn't exist in `docs/collections/_events/`. Either:

- Add the missing event markdown file
- Update the service's `events-raised` or `events-consumed` list

### "No yaml schema files found"

Check that the paths in `config.yaml` are correct relative to the `src/asyncapigenerator` directory.

### Invalid AsyncAPI output

Run validation:

```bash
asyncapi validate output/asyncapi-mesh-poller.yaml
```

## Examples

See `example_usage.py` for Python API examples.

## Documentation

- `README.md` - Full documentation
- `ARCHITECTURE.md` - Design and extension points
- `COMPARISON.md` - Comparison with manual AsyncAPI
- `config.example.yaml` - Configuration reference

## Support

For issues or questions:

1. Check the documentation files
2. Review generated warnings
3. Validate AsyncAPI output with `asyncapi validate`
4. Check event and service markdown frontmatter
