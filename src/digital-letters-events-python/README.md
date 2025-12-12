<!-- vale Vale.Terms = NO -->
<!-- vale Vale.Avoid = NO -->
# digital-letters-events-python
<!-- vale Vale.Terms = YES -->
<!-- vale Vale.Avoid = YES -->

<!-- vale Vale.Terms = NO -->
This package contains the automatically-generated Pydantic v2 models that the [pydantic-model-generator](../pydantic-model-generator/) tool produces.
<!-- vale Vale.Terms = YES -->

The source files in this package should not be edited directly. If changes are required, update the schemas in the [schemas/digital-letters/2025-10-draft/events](../../schemas/digital-letters/2025-10-draft/events) directory and use the `pydantic-model-generator` tool to regenerate them.

## Using this Package

### Using Event Models

The Pydantic models can be used by installing the `digital-letters-events-python` package and importing the desired model:

```python
from digital_letters_events_python import PDMResourceSubmitted

try:
    # Validate and parse an event
    event_data = {
        "type": "uk.nhs.notify.digital.letters.pdm.resource.submitted.v1",
        "source": "/nhs/england/notify/staging/dev-647563337/data-plane/digitalletters/pdm",
        "dataschema": "https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-submitted-data.schema.json",
        "specversion": "1.0",
        "id": "0249e529-f947-4012-819e-b634eb71be79",
        "subject": "pdm-resource-123",
        "time": "2025-12-11T10:00:00Z",
        "data": {
            "something": "example value"
        }
    }

    # Create and validate the event
    event = PDMResourceSubmitted(**event_data)

    # Access validated fields
    print(event.id)
    print(event.type)
    print(event.data.something)
except Exception as e:
    print(e)
```

### Type Safety and Validation

All generated models include:

- Type hints for all fields
- Runtime validation via Pydantic
- Automatic conversion of types where appropriate
- Clear error messages for validation failures

## Development

This package is automatically generated. Do not edit the files in the [`models`](./models/) directory directly.

To regenerate the models:

```bash
cd ../pydantic-model-generator
make generate
```
