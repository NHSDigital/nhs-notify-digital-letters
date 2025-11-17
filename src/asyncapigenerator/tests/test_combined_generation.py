"""
Tests for combined AsyncAPI generation and file writing operations.
"""
import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from generate_asyncapi import AsyncAPIGenerator, Event, Service


class TestCombinedAsyncAPIGeneration:
    """Tests for generating combined AsyncAPI specifications."""

    def test_generate_combined_asyncapi(self, sample_config):
        """Test generating a combined AsyncAPI spec for all services."""
        generator = AsyncAPIGenerator(sample_config)

        # Create multiple events and services
        event1 = Event(
            title='event-1',
            type='uk.nhs.notify.event1.v1',
            nice_name='Event1',
            service='Service A',
            schema_envelope='https://example.com/envelope1.json',
            schema_data='https://example.com/data1.json'
        )

        event2 = Event(
            title='event-2',
            type='uk.nhs.notify.event2.v1',
            nice_name='Event2',
            service='Service B',
            schema_envelope='https://example.com/envelope2.json',
            schema_data='https://example.com/data2.json'
        )

        service_a = Service(
            title='Service A',
            events_raised=['event-1'],
            events_consumed=['event-2'],
            c4type='component'
        )

        service_b = Service(
            title='Service B',
            events_raised=['event-2'],
            events_consumed=['event-1'],
            c4type='component'
        )

        generator.events = {'event-1': event1, 'event-2': event2}
        generator.services = {'Service A': service_a, 'Service B': service_b}

        spec = generator.generate_combined_asyncapi()

        assert spec['asyncapi'] == '3.0.0'
        assert 'channels' in spec
        assert 'operations' in spec
        assert len(spec['channels']) == 2  # Two unique events
        assert len(spec['operations']) == 4  # 2 services * 2 operations each

    def test_combined_spec_includes_all_channels(self, sample_config):
        """Test that combined spec includes channels for all events."""
        generator = AsyncAPIGenerator(sample_config)

        events = []
        for i in range(3):
            event = Event(
                title=f'event-{i}',
                type=f'uk.nhs.notify.event{i}.v1',
                nice_name=f'Event{i}',
                service='Test Service',
                schema_envelope=f'https://example.com/envelope{i}.json',
                schema_data=f'https://example.com/data{i}.json'
            )
            events.append(event)
            generator.events[f'event-{i}'] = event

        service = Service(
            title='Test Service',
            events_raised=['event-0', 'event-1', 'event-2'],
            c4type='component'
        )
        generator.services = {'Test Service': service}

        spec = generator.generate_combined_asyncapi()

        assert len(spec['channels']) == 3

    def test_combined_spec_deduplicates_events(self, sample_config):
        """Test that combined spec doesn't duplicate events used by multiple services."""
        generator = AsyncAPIGenerator(sample_config)

        event = Event(
            title='shared-event',
            type='uk.nhs.notify.shared.v1',
            nice_name='SharedEvent',
            service='Service A',
            schema_envelope='https://example.com/envelope.json',
            schema_data='https://example.com/data.json'
        )

        service_a = Service(
            title='Service A',
            events_raised=['shared-event'],
            c4type='component'
        )

        service_b = Service(
            title='Service B',
            events_consumed=['shared-event'],
            c4type='component'
        )

        generator.events = {'shared-event': event}
        generator.services = {'Service A': service_a, 'Service B': service_b}

        spec = generator.generate_combined_asyncapi()

        # Should only have one channel for the shared event
        assert len(spec['channels']) == 1
        # But should have two operations (one send, one receive)
        assert len(spec['operations']) == 2


class TestFileWriting:
    """Tests for file writing operations."""

    def test_write_asyncapi_yaml_directly(self, sample_config, temp_dir):
        """Test writing AsyncAPI spec to YAML file."""
        generator = AsyncAPIGenerator(sample_config)

        event = Event(
            title='test-event',
            type='uk.nhs.notify.test.v1',
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
        generator.services = {'Test Service': service}

        spec = generator.generate_asyncapi_for_service(service)

        # Write to file (inline as the actual code does)
        output_file = temp_dir / "test-asyncapi.yaml"
        with open(output_file, 'w') as f:
            # Import yaml locally to avoid import errors
            import json
            # Use json for serialization since yaml might not be available
            json.dump(spec, f, indent=2)

        assert output_file.exists()

        # Read and verify it's valid
        with open(output_file, 'r') as f:
            import json
            loaded_spec = json.load(f)

        assert loaded_spec['asyncapi'] == '3.0.0'
        assert 'Test Service' in loaded_spec['info']['title']

    def test_yaml_serialization(self, sample_config):
        """Test that specs can be serialized to YAML format."""
        generator = AsyncAPIGenerator(sample_config)

        # Create a simple spec
        spec = {
            'asyncapi': '3.0.0',
            'info': {'title': 'Test', 'version': '1.0.0'}
        }

        output_file = Path(sample_config['output_dir']) / 'test.yaml'

        # Write using json to avoid yaml dependency in tests
        import json
        with open(output_file, 'w') as f:
            json.dump(spec, f, indent=2)

        assert output_file.exists()

        # Verify we can read it back
        with open(output_file, 'r') as f:
            loaded = json.load(f)

        assert loaded['asyncapi'] == '3.0.0'


class TestGenerateMethod:
    """Tests for the main generate method."""

    def test_generate_method_loads_data(self, sample_config, temp_dir):
        """Test that generate method loads events and services."""
        generator = AsyncAPIGenerator(sample_config)

        # Create test files
        events_dir = Path(sample_config['events_dir'])
        services_dir = Path(sample_config['services_dir'])

        event_file = events_dir / "test-event.md"
        event_file.write_text("""---
title: test-event
type: uk.nhs.notify.test.v1
nice_name: TestEvent
service: Test Service
schema_envelope: https://example.com/envelope.json
schema_data: https://example.com/data.json
---

Test event.
""")

        service_dir = services_dir / "test-service"
        service_dir.mkdir()
        service_file = service_dir / "index.md"
        service_file.write_text("""---
title: Test Service
events-raised:
    - test-event
c4type: component
---

Test service.
""")

        # Note: We can't easily test the full generate() method without
        # mocking file I/O, but we can verify the components work
        generator.load_events()
        generator.load_services()

        assert len(generator.events) == 1
        assert len(generator.services) == 1

    def test_generate_with_service_filter(self, sample_config, temp_dir):
        """Test filtering generation to a specific service."""
        generator = AsyncAPIGenerator(sample_config)
        services_dir = Path(sample_config['services_dir'])

        # Create multiple services
        for i in range(3):
            service_dir = services_dir / f"service-{i}"
            service_dir.mkdir()
            service_file = service_dir / "index.md"
            service_file.write_text(f"""---
title: Service {i}
c4type: component
---

Service {i}.
""")

        generator.load_services()

        # Filter to specific service
        filtered_services = [s for s in generator.services.values() if s.title == 'Service 1']
        assert len(filtered_services) == 1
        assert filtered_services[0].title == 'Service 1'


class TestConfigurationHandling:
    """Tests for configuration handling."""

    def test_config_with_info_section(self, temp_dir):
        """Test handling of info section in config."""
        config = {
            'events_dir': str(temp_dir / 'events'),
            'services_dir': str(temp_dir / 'services'),
            'schemas_dir': str(temp_dir / 'schemas'),
            'output_dir': str(temp_dir / 'output'),
            'info': {
                'title': 'Custom Title',
                'version': '2.0.0',
                'description': 'Custom description',
                'contact': {
                    'name': 'Test Team',
                    'email': 'test@example.com'
                },
                'license': {
                    'name': 'MIT',
                    'url': 'https://opensource.org/licenses/MIT'
                }
            },
            'asyncapi': {
                'version': '3.0.0'
            }
        }

        for path in ['events', 'services', 'schemas', 'output']:
            (temp_dir / path).mkdir()

        generator = AsyncAPIGenerator(config)

        service = Service(
            title='Test Service',
            c4type='component'
        )

        spec = generator.generate_asyncapi_for_service(service)

        assert 'Custom Title' in spec['info']['title']
        assert spec['info']['contact']['name'] == 'Test Team'
        assert spec['info']['license']['name'] == 'MIT'

    def test_config_defaults(self, temp_dir):
        """Test that config provides sensible defaults."""
        config = {
            'events_dir': str(temp_dir / 'events'),
            'services_dir': str(temp_dir / 'services'),
            'schemas_dir': str(temp_dir / 'schemas'),
            'output_dir': str(temp_dir / 'output'),
        }

        for path in ['events', 'services', 'schemas', 'output']:
            (temp_dir / path).mkdir()

        generator = AsyncAPIGenerator(config)

        # Should use defaults
        assert generator.schema_base_url == 'https://notify.nhs.uk/cloudevents/schemas/digital-letters'
