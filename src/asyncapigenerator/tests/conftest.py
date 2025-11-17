"""Pytest configuration and shared fixtures for asyncapigenerator tests."""
import pytest
import tempfile
from pathlib import Path
from typing import Dict, Any


@pytest.fixture
def temp_dir():
    """Create a temporary directory for test files."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        yield Path(tmp_dir)


@pytest.fixture
def sample_config(temp_dir: Path) -> Dict[str, Any]:
    """Provide a sample configuration for tests."""
    events_dir = temp_dir / "events"
    services_dir = temp_dir / "services"
    schemas_dir = temp_dir / "schemas"
    output_dir = temp_dir / "output"

    events_dir.mkdir()
    services_dir.mkdir()
    schemas_dir.mkdir()
    output_dir.mkdir()

    return {
        'events_dir': str(events_dir),
        'services_dir': str(services_dir),
        'schemas_dir': str(schemas_dir),
        'output_dir': str(output_dir),
        'schema_base_url': 'https://notify.nhs.uk/cloudevents/schemas/digital-letters'
    }


@pytest.fixture
def sample_event_markdown() -> str:
    """Provide sample event markdown content."""
    return """---
title: test-event
type: uk.nhs.notify.test.v1
nice_name: TestEvent
service: Test Service
schema_envelope: https://example.com/envelope.json
schema_data: https://example.com/data.json
---

# Test Event

This is a test event description.
"""


@pytest.fixture
def sample_service_markdown() -> str:
    """Provide sample service markdown content."""
    return """---
title: Test Service
events_raised:
    - test-event
    - another-event
events_consumed:
    - consumed-event
c4type: component
owner: Test Team
---

# Test Service

This is a test service description.
"""


@pytest.fixture
def sample_event_data() -> Dict[str, Any]:
    """Provide sample event data."""
    return {
        'title': 'test-event',
        'type': 'uk.nhs.notify.test.v1',
        'nice_name': 'TestEvent',
        'service': 'Test Service',
        'schema_envelope': 'https://example.com/envelope.json',
        'schema_data': 'https://example.com/data.json',
        'description': 'Test event description'
    }


@pytest.fixture
def sample_service_data() -> Dict[str, Any]:
    """Provide sample service data."""
    return {
        'title': 'Test Service',
        'events_raised': ['test-event', 'another-event'],
        'events_consumed': ['consumed-event'],
        'c4type': 'component',
        'owner': 'Test Team',
        'description': 'Test service description'
    }
