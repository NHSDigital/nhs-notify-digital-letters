# Architecture

## Overview

The AsyncAPI Generator is designed to automatically generate AsyncAPI 3.0 specifications from your existing event documentation and service architecture definitions.

## Components

### 1. Event Definitions (`docs/collections/_events/*.md`)

Event markdown files contain frontmatter with:

```yaml
---
title: mesh-inbox-message-received
type: uk.nhs.notify.digital.letters.mesh.inbox.message.received.v1
nice_name: MESHInboxMessageReceived
service: MESH Services
schema_envelope: https://...event.schema.json
schema_data: https://...data.schema.json
---
```

These map directly to AsyncAPI **messages** and **channels**.

### 2. Service Definitions (`docs/architecture/c4/notifhir/`)

Service architecture files contain frontmatter with:

```yaml
---
title: MESH Poller
parent: MESH Services
events-raised: [mesh-inbox-message-received]
events-consumed: [mesh-poller-timer-expired]
c4type: code
owner: Tom D'Roza
---
```

These map to AsyncAPI **operations** (send/receive).

### 3. JSON Schemas (`schemas/digital-letters/`)

CloudEvents and data schemas are referenced but not transformed. The AsyncAPI specs contain `$ref` links to these schemas.

## Mapping to AsyncAPI

### Events → Channels + Messages

Each event becomes:

1. **Channel**: Named from the event type (with `/` instead of `.`)
   - Address: `uk/nhs/notify/digital/letters/mesh/inbox/message/received/v1`

2. **Message**: Contains the event metadata
   - Content type: `application/cloudevents+json`
   - Payload: `$ref` to the CloudEvents envelope schema
   - Traits: Reference to the data schema

### Services → Operations

For each service:

1. **Send Operations**: Created for each event in `events-raised`
   - Action: `send`
   - Links to the channel for that event

2. **Receive Operations**: Created for each event in `events-consumed`
   - Action: `receive`
   - Links to the channel for that event

## Output Structure

```plain
output/
├── asyncapi-all.yaml                    # Combined spec for all services
├── asyncapi-mesh-poller.yaml            # Individual service specs
├── asyncapi-pdm-uploader.yaml
├── asyncapi-reporting.yaml
└── ...
```

### Per-Service AsyncAPI

Each service gets its own AsyncAPI specification containing:

- Only the channels for events it produces/consumes
- Send operations for events it raises
- Receive operations for events it consumes
- Service metadata (owner, author, C4 type, etc.)

### Combined AsyncAPI

The combined specification contains:

- All channels (one per unique event type)
- All operations from all services
- Useful for visualizing the entire event-driven architecture

## Design Decisions

### Why AsyncAPI 3.0?

AsyncAPI 3.0 provides:

- Clear separation of channels and operations
- Better support for request/reply patterns
- Improved message reuse across channels
- More flexible bindings

### Why Python?

Python was chosen because:

- Existing tooling (`cloudeventjekylldocs`) uses Python
- Excellent yaml processing libraries
- Easy to extend and customize
- Good for scripting and automation

### Why CloudEvents?

The system already uses CloudEvents as the event format:

- Standard envelope format
- Clear separation of metadata and data
- Wide ecosystem support
- Easy to validate

## Extension Points

The generator can be extended in several ways:

### 1. Custom Channel Naming

Modify `generate_channel_for_event()` to change how channels are named:

```python
def generate_channel_for_event(self, event: Event) -> Dict[str, Any]:
    # Custom naming: use service name in channel
    channel_name = f"{event.service}/{event.type}".replace(' ', '-').lower()
    ...
```

### 2. Additional Message Metadata

Add more message properties in `generate_channel_for_event()`:

```python
message = {
    'name': event.nice_name,
    'title': event.nice_name,
    'summary': f'Event: {event.type}',
    'description': event.description,
    'contentType': 'application/cloudevents+json',
    'payload': {'$ref': event.schema_envelope},
    'x-custom-metadata': {
        'service': event.service,
        'owner': 'extracted from service'
    }
}
```

### 3. Bindings

Add protocol-specific bindings for AWS EventBridge, Kafka, etc.:

```python
channel = {
    'address': channel_name,
    'messages': {...},
    'bindings': {
        'eventbridge': {
            'source': event.service,
            'detailType': event.type
        }
    }
}
```

### 4. Tags and Groups

Organize operations with tags:

```python
asyncapi_spec['operations'][operation_id] = {
    'action': 'send',
    'channel': {'$ref': f'#/channels/{channel_id}'},
    'summary': f'Send {event.nice_name}',
    'tags': [
        {'name': event.service},
        {'name': 'production'}
    ]
}
```

## Validation

AsyncAPI specifications can be validated using the AsyncAPI CLI:

```bash
npm install -g @asyncapi/cli
asyncapi validate output/asyncapi-mesh-poller.yaml
```

## Visualization

AsyncAPI specs can be visualized using:

1. **AsyncAPI Studio**: <https://studio.asyncapi.com/>
2. **AsyncAPI Generator HTML template**:

   ```bash
   asyncapi generate fromTemplate output/asyncapi-mesh-poller.yaml @asyncapi/html-template
   ```

## Future Enhancements

Potential improvements:

1. **Sequence Diagrams**: Generate from operation flows
2. **Mermaid Diagrams**: Convert to Mermaid syntax for markdown
3. **OpenAPI Integration**: Generate REST APIs for event triggers
4. **Code Generation**: Use AsyncAPI codegen for TypeScript/Python clients
5. **GraphQL Schema**: Generate GraphQL subscriptions for events
6. **Documentation Site**: Auto-generate documentation site from AsyncAPI
