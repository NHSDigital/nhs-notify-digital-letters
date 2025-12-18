"""
Tests for the AsyncAPI Generator core functionality.

Converted from test_generator.py to proper pytest format.
"""
import pytest
from pathlib import Path
import sys

# Add parent directory to path to import generate_asyncapi
sys.path.insert(0, str(Path(__file__).parent.parent))

from generate_asyncapi import AsyncAPIGenerator, Event, Service


class TestFrontmatterParsing:
    """Tests for frontmatter parsing functionality."""

    def test_parse_valid_frontmatter(self, sample_config):
        """Test parsing valid YAML frontmatter from markdown."""
        generator = AsyncAPIGenerator(sample_config)

        content = """---
title: test-event
type: uk.nhs.notify.test.v1
service: Test Service
---

This is content.
"""

        result = generator.parse_frontmatter(content)
        assert result['title'] == 'test-event'
        assert result['type'] == 'uk.nhs.notify.test.v1'
        assert result['service'] == 'Test Service'

    def test_parse_invalid_frontmatter(self, sample_config):
        """Test handling of content without frontmatter."""
        generator = AsyncAPIGenerator(sample_config)

        content_no_fm = "No frontmatter here"
        result = generator.parse_frontmatter(content_no_fm)
        assert result == {}

    def test_parse_malformed_frontmatter(self, sample_config):
        """Test handling of malformed YAML frontmatter."""
        generator = AsyncAPIGenerator(sample_config)

        content = """---
title: test-event
invalid yaml: [[[
---

Content
"""
        result = generator.parse_frontmatter(content)
        # Should return empty dict on parse error
        assert result == {}


class TestEventDataclass:
    """Tests for the Event dataclass."""

    def test_event_creation(self):
        """Test creating an Event instance."""
        event = Event(
            title='test-event',
            type='uk.nhs.notify.test.v1',
            nice_name='TestEvent',
            service='Test Service',
            schema_envelope='https://example.com/envelope.json',
            schema_data='https://example.com/data.json',
            description='Test description'
        )

        assert event.title == 'test-event'
        assert event.type == 'uk.nhs.notify.test.v1'
        assert event.nice_name == 'TestEvent'
        assert event.service == 'Test Service'
        assert event.schema_envelope == 'https://example.com/envelope.json'
        assert event.schema_data == 'https://example.com/data.json'
        assert event.description == 'Test description'

    def test_event_optional_fields(self):
        """Test Event with optional fields."""
        event = Event(
            title='test-event',
            type='uk.nhs.notify.test.v1',
            nice_name='TestEvent',
            service='Test Service',
            schema_envelope='https://example.com/envelope.json',
            schema_data='https://example.com/data.json'
        )

        assert event.description == ""
        assert event.file_path is None


class TestServiceDataclass:
    """Tests for the Service dataclass."""

    def test_service_creation(self):
        """Test creating a Service instance."""
        service = Service(
            title='Test Service',
            events_raised=['event1', 'event2'],
            events_consumed=['event3'],
            c4type='component',
            owner='Test Owner'
        )

        assert service.title == 'Test Service'
        assert len(service.events_raised) == 2
        assert 'event1' in service.events_raised
        assert 'event2' in service.events_raised
        assert len(service.events_consumed) == 1
        assert 'event3' in service.events_consumed
        assert service.c4type == 'component'
        assert service.owner == 'Test Owner'

    def test_service_default_fields(self):
        """Test Service with default fields."""
        service = Service(title='Test Service')

        assert service.parent is None
        assert service.events_raised == []
        assert service.events_consumed == []
        assert service.c4type is None
        assert service.owner is None
        assert service.author is None
        assert service.description == ""
        assert service.file_path is None


class TestAsyncAPIGenerator:
    """Tests for the AsyncAPIGenerator class."""

    def test_generator_initialization(self, sample_config):
        """Test generator initialization with config."""
        generator = AsyncAPIGenerator(sample_config)

        assert generator.events_dir.exists()
        assert generator.services_dir.exists()
        assert generator.schemas_dir.exists()
        assert generator.output_dir.exists()
        assert generator.schema_base_url == 'https://notify.nhs.uk/cloudevents/schemas/digital-letters'
        assert generator.events == {}
        assert generator.services == {}

    def test_output_directory_creation(self, temp_dir):
        """Test that output directory is created if it doesn't exist."""
        config = {
            'events_dir': str(temp_dir / 'events'),
            'services_dir': str(temp_dir / 'services'),
            'schemas_dir': str(temp_dir / 'schemas'),
            'output_dir': str(temp_dir / 'output'),
        }

        generator = AsyncAPIGenerator(config)
        assert generator.output_dir.exists()
        assert generator.output_dir.is_dir()
