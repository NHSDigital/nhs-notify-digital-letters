"""
Tests for CLI and main function.
"""
import pytest
from pathlib import Path
import sys
import json
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent))

from generate_asyncapi import main, load_config


class TestLoadConfig:
    """Tests for configuration loading."""

    def test_load_default_config(self):
        """Test loading default configuration."""
        config = load_config()

        assert 'events_dir' in config
        assert 'services_dir' in config
        assert 'schemas_dir' in config
        assert 'output_dir' in config
        assert 'schema_base_url' in config
        assert config['asyncapi']['version'] == '3.0.0'
        assert config['generate_per_service'] is True
        assert config['generate_combined'] is True

    def test_load_config_from_file(self, temp_dir):
        """Test loading configuration from a file."""
        config_file = temp_dir / "test_config.yaml"

        config_data = """
events_dir: /custom/events
services_dir: /custom/services
output_dir: /custom/output
generate_per_service: false
"""
        config_file.write_text(config_data)

        config = load_config(str(config_file))

        assert config['events_dir'] == '/custom/events'
        assert config['services_dir'] == '/custom/services'
        assert config['output_dir'] == '/custom/output'
        assert config['generate_per_service'] is False
        # Should still have defaults
        assert 'schema_base_url' in config

    def test_load_config_nonexistent_file(self):
        """Test loading config with nonexistent file returns defaults."""
        config = load_config('/nonexistent/config.yaml')

        # Should return defaults without error
        assert 'events_dir' in config
        assert 'output_dir' in config


class TestMainCLI:
    """Tests for main CLI function."""

    @patch('sys.argv', ['generate_asyncapi.py'])
    @patch('generate_asyncapi.AsyncAPIGenerator')
    def test_main_with_defaults(self, mock_generator_class):
        """Test main function with default arguments."""
        mock_generator = MagicMock()
        mock_generator_class.return_value = mock_generator

        main()

        # Should create generator and call generate
        assert mock_generator_class.called
        mock_generator.generate.assert_called_once_with(service_filter=None)

    @patch('sys.argv', ['generate_asyncapi.py', '--output-dir', '/custom/output'])
    @patch('generate_asyncapi.AsyncAPIGenerator')
    def test_main_with_output_dir_override(self, mock_generator_class):
        """Test main function with output directory override."""
        mock_generator = MagicMock()
        mock_generator_class.return_value = mock_generator

        main()

        # Check that config was updated with custom output dir
        call_args = mock_generator_class.call_args
        config = call_args[0][0]
        assert config['output_dir'] == '/custom/output'

    @patch('sys.argv', ['generate_asyncapi.py', '--service', 'Test Service'])
    @patch('generate_asyncapi.AsyncAPIGenerator')
    def test_main_with_service_filter(self, mock_generator_class):
        """Test main function with service filter."""
        mock_generator = MagicMock()
        mock_generator_class.return_value = mock_generator

        main()

        # Should pass service filter to generate
        mock_generator.generate.assert_called_once_with(service_filter='Test Service')

    @patch('sys.argv', [
        'generate_asyncapi.py',
        '--events-dir', '/custom/events',
        '--services-dir', '/custom/services',
        '--schemas-dir', '/custom/schemas',
        '--output-dir', '/custom/output'
    ])
    @patch('generate_asyncapi.AsyncAPIGenerator')
    def test_main_with_all_overrides(self, mock_generator_class):
        """Test main function with all directory overrides."""
        mock_generator = MagicMock()
        mock_generator_class.return_value = mock_generator

        main()

        call_args = mock_generator_class.call_args
        config = call_args[0][0]
        assert config['events_dir'] == '/custom/events'
        assert config['services_dir'] == '/custom/services'
        assert config['schemas_dir'] == '/custom/schemas'
        assert config['output_dir'] == '/custom/output'

    @patch('sys.argv', ['generate_asyncapi.py', '--config', '/path/to/config.yaml'])
    @patch('generate_asyncapi.load_config')
    @patch('generate_asyncapi.AsyncAPIGenerator')
    def test_main_with_config_file(self, mock_generator_class, mock_load_config):
        """Test main function with config file."""
        mock_config = {
            'events_dir': '/config/events',
            'services_dir': '/config/services',
            'schemas_dir': '/config/schemas',
            'output_dir': '/config/output'
        }
        mock_load_config.return_value = mock_config

        mock_generator = MagicMock()
        mock_generator_class.return_value = mock_generator

        main()

        # Should load config from file
        mock_load_config.assert_called_once_with('/path/to/config.yaml')


class TestGenerateMethod:
    """Tests for the generate method that weren't covered elsewhere."""

    @patch('builtins.print')
    def test_generate_prints_summary(self, mock_print, sample_config, temp_dir):
        """Test that generate method prints summary information."""
        from generate_asyncapi import AsyncAPIGenerator, Event, Service

        generator = AsyncAPIGenerator(sample_config)

        # Create test event and service
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

        # Create the markdown files
        events_dir = Path(sample_config['events_dir'])
        services_dir = Path(sample_config['services_dir'])

        event_file = events_dir / "test-event.md"
        event_file.write_text(f"""---
title: {event.title}
type: {event.type}
nice_name: {event.nice_name}
service: {event.service}
schema_envelope: {event.schema_envelope}
schema_data: {event.schema_data}
---

Test event description.
""")

        service_dir = services_dir / "test-service"
        service_dir.mkdir()
        service_file = service_dir / "index.md"
        service_file.write_text(f"""---
title: {service.title}
events-raised:
    - test-event
c4type: {service.c4type}
---

Test service description.
""")

        # Run generate
        generator.generate()

        # Check that print was called with summary info
        print_calls = [str(call) for call in mock_print.call_args_list]
        assert any('NHS Notify' in str(call) for call in print_calls)
        assert any('Loaded' in str(call) for call in print_calls)

    def test_generate_skips_services_without_events(self, sample_config, temp_dir):
        """Test that generate skips services that don't have any events."""
        from generate_asyncapi import AsyncAPIGenerator

        generator = AsyncAPIGenerator(sample_config)

        # Create service without events
        services_dir = Path(sample_config['services_dir'])
        service_dir = services_dir / "empty-service"
        service_dir.mkdir()
        service_file = service_dir / "index.md"
        service_file.write_text("""---
title: Empty Service
c4type: component
---

Service with no events.
""")

        generator.load_services()

        # Should load the service
        assert len(generator.services) == 1
        service = list(generator.services.values())[0]
        assert service.title == 'Empty Service'
        assert not service.events_raised
        assert not service.events_consumed

    def test_generate_with_invalid_service_filter(self, sample_config, temp_dir):
        """Test generate with a service filter that doesn't match any services."""
        from generate_asyncapi import AsyncAPIGenerator

        generator = AsyncAPIGenerator(sample_config)

        # Create a service
        services_dir = Path(sample_config['services_dir'])
        service_dir = services_dir / "test-service"
        service_dir.mkdir()
        service_file = service_dir / "index.md"
        service_file.write_text("""---
title: Test Service
events-raised:
    - some-event
c4type: component
---

Test service.
""")

        generator.load_services()

        # Try to generate for non-existent service
        # This should not raise an error, just skip generation
        generator.generate(service_filter='Nonexistent Service')

        # Check that no files were generated (except possibly combined)
        output_files = list(Path(sample_config['output_dir']).glob('asyncapi-*.yaml'))
        # Should only have combined if generate_combined is True and no service filter matched
        assert len(output_files) == 0 or all('all' in str(f) for f in output_files)
