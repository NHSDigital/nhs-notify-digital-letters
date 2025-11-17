"""
Tests for AsyncAPI specification generation.
"""
import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from generate_asyncapi import AsyncAPIGenerator, Event, Service


class TestChannelGeneration:
    """Tests for generating AsyncAPI channel definitions."""

    def test_generate_channel_for_event(self, sample_config):
        """Test generating a channel from an event."""
        generator = AsyncAPIGenerator(sample_config)

        event = Event(
            title='test-event',
            type='uk.nhs.notify.test.event.v1',
            nice_name='TestEvent',
            service='Test Service',
            schema_envelope='https://example.com/envelope.json',
            schema_data='https://example.com/data.json',
            description='Test event description'
        )

        channel = generator.generate_channel_for_event(event)

        assert 'address' in channel
        assert channel['address'] == 'uk/nhs/notify/test/event/v1'
        assert 'messages' in channel
        assert 'TestEvent' in channel['messages']
        assert channel['messages']['TestEvent']['contentType'] == 'application/cloudevents+json'
        assert channel['messages']['TestEvent']['payload']['$ref'] == 'https://example.com/envelope.json'

    def test_channel_includes_data_schema_trait(self, sample_config):
        """Test that channel includes data schema as trait."""
        generator = AsyncAPIGenerator(sample_config)

        event = Event(
            title='test-event',
            type='uk.nhs.notify.test.v1',
            nice_name='TestEvent',
            service='Test Service',
            schema_envelope='https://example.com/envelope.json',
            schema_data='https://example.com/data.json'
        )

        channel = generator.generate_channel_for_event(event)

        message = channel['messages']['TestEvent']
        assert 'traits' in message
        assert len(message['traits']) > 0
        assert 'data.json' in str(message['traits'])


class TestAsyncAPIServiceGeneration:
    """Tests for generating AsyncAPI specs for services."""

    def test_generate_asyncapi_for_service(self, sample_config):
        """Test generating AsyncAPI specification for a service."""
        generator = AsyncAPIGenerator(sample_config)

        event = Event(
            title='test-event',
            type='uk.nhs.notify.test.event.v1',
            nice_name='TestEvent',
            service='Test Service',
            schema_envelope='https://example.com/envelope.json',
            schema_data='https://example.com/data.json'
        )

        service = Service(
            title='Test Service',
            events_raised=['test-event'],
            events_consumed=[],
            c4type='component',
            owner='Test Team'
        )

        generator.events = {'test-event': event}
        generator.services = {'Test Service': service}

        spec = generator.generate_asyncapi_for_service(service)

        assert spec['asyncapi'] == '3.0.0'
        assert 'Test Service' in spec['info']['title']
        assert 'channels' in spec
        assert 'operations' in spec
        assert len(spec['channels']) > 0
        assert len(spec['operations']) > 0

    def test_asyncapi_includes_send_operations(self, sample_config):
        """Test that AsyncAPI includes send operations for raised events."""
        generator = AsyncAPIGenerator(sample_config)

        event = Event(
            title='raised-event',
            type='uk.nhs.notify.raised.v1',
            nice_name='RaisedEvent',
            service='Test Service',
            schema_envelope='https://example.com/envelope.json',
            schema_data='https://example.com/data.json'
        )

        service = Service(
            title='Test Service',
            events_raised=['raised-event'],
            c4type='component'
        )

        generator.events = {'raised-event': event}

        spec = generator.generate_asyncapi_for_service(service)

        # Should have a send operation
        send_operations = [op for op_id, op in spec['operations'].items()
                            if op['action'] == 'send']
        assert len(send_operations) > 0

    def test_asyncapi_includes_receive_operations(self, sample_config):
        """Test that AsyncAPI includes receive operations for consumed events."""
        generator = AsyncAPIGenerator(sample_config)

        event = Event(
            title='consumed-event',
            type='uk.nhs.notify.consumed.v1',
            nice_name='ConsumedEvent',
            service='Test Service',
            schema_envelope='https://example.com/envelope.json',
            schema_data='https://example.com/data.json'
        )

        service = Service(
            title='Test Service',
            events_consumed=['consumed-event'],
            c4type='component'
        )

        generator.events = {'consumed-event': event}

        spec = generator.generate_asyncapi_for_service(service)

        # Should have a receive operation
        receive_operations = [op for op_id, op in spec['operations'].items()
                                if op['action'] == 'receive']
        assert len(receive_operations) > 0

    def test_asyncapi_handles_missing_events(self, sample_config):
        """Test that generator handles references to missing events gracefully."""
        generator = AsyncAPIGenerator(sample_config)

        service = Service(
            title='Test Service',
            events_raised=['nonexistent-event'],
            c4type='component'
        )

        # Don't add the event to generator.events

        spec = generator.generate_asyncapi_for_service(service)

        # Should still generate a valid spec, just without the missing event
        assert spec['asyncapi'] == '3.0.0'
        assert len(spec['channels']) == 0
        assert len(spec['operations']) == 0

    def test_asyncapi_includes_service_metadata(self, sample_config):
        """Test that AsyncAPI spec includes service metadata."""
        generator = AsyncAPIGenerator(sample_config)

        service = Service(
            title='Test Service',
            c4type='component',
            owner='Test Team',
            author='Test Author',
            parent='Parent Service'
        )

        spec = generator.generate_asyncapi_for_service(service)

        assert 'x-service-metadata' in spec['info']
        metadata = spec['info']['x-service-metadata']
        assert metadata['c4type'] == 'component'
        assert metadata['owner'] == 'Test Team'
        assert metadata['author'] == 'Test Author'
        assert metadata['parent'] == 'Parent Service'

    def test_channel_ids_use_underscores(self, sample_config):
        """Test that channel IDs replace dots with underscores."""
        generator = AsyncAPIGenerator(sample_config)

        event = Event(
            title='test-event',
            type='uk.nhs.notify.test.event.v1',
            nice_name='TestEvent',
            service='Test Service',
            schema_envelope='https://example.com/envelope.json',
            schema_data='https://example.com/data.json'
        )

        service = Service(
            title='Test Service',
            events_raised=['test-event'],
            c4type='component'
        )

        generator.events = {'test-event': event}

        spec = generator.generate_asyncapi_for_service(service)

        # Channel ID should have underscores instead of dots
        expected_channel_id = 'uk_nhs_notify_test_event_v1'
        assert expected_channel_id in spec['channels']
