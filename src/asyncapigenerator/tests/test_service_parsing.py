"""
Tests for service loading and parsing functionality.
"""
import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from generate_asyncapi import AsyncAPIGenerator, Service


class TestServiceLoading:
    """Tests for loading services from architecture files."""

    def test_load_services_from_directory(self, sample_config, temp_dir):
        """Test loading services from index.md files."""
        generator = AsyncAPIGenerator(sample_config)
        services_dir = Path(sample_config['services_dir'])

        # Create a sample service file
        service_dir = services_dir / "test-service"
        service_dir.mkdir()
        service_file = service_dir / "index.md"
        service_file.write_text("""---
title: Test Service
events-raised:
    - test-event
    - another-event
events-consumed:
    - consumed-event
c4type: component
owner: Test Team
---

# Test Service

This is a test service description.
""")

        generator.load_services()

        assert 'Test Service' in generator.services
        service = generator.services['Test Service']
        assert service.title == 'Test Service'
        assert len(service.events_raised) == 2
        assert 'test-event' in service.events_raised
        assert 'another-event' in service.events_raised
        assert len(service.events_consumed) == 1
        assert 'consumed-event' in service.events_consumed
        assert service.c4type == 'component'
        assert service.owner == 'Test Team'

    def test_load_multiple_services(self, sample_config, temp_dir):
        """Test loading multiple service files."""
        generator = AsyncAPIGenerator(sample_config)
        services_dir = Path(sample_config['services_dir'])

        # Create multiple service directories
        for i in range(3):
            service_dir = services_dir / f"service-{i}"
            service_dir.mkdir()
            service_file = service_dir / "index.md"
            service_file.write_text(f"""---
title: Service {i}
c4type: component
---

Service {i} description.
""")

        generator.load_services()

        assert len(generator.services) == 3
        for i in range(3):
            assert f'Service {i}' in generator.services

    def test_parse_comma_separated_events(self, sample_config, temp_dir):
        """Test parsing comma-separated event lists."""
        generator = AsyncAPIGenerator(sample_config)
        services_dir = Path(sample_config['services_dir'])

        service_dir = services_dir / "service-csv"
        service_dir.mkdir()
        service_file = service_dir / "index.md"
        service_file.write_text("""---
title: CSV Service
events-raised: event1, event2, event3
events-consumed: event4, event5
---

Service with CSV events.
""")

        generator.load_services()

        service = generator.services['CSV Service']
        assert len(service.events_raised) == 3
        assert 'event1' in service.events_raised
        assert 'event2' in service.events_raised
        assert 'event3' in service.events_raised
        assert len(service.events_consumed) == 2
        assert 'event4' in service.events_consumed
        assert 'event5' in service.events_consumed

    def test_parse_space_separated_events(self, sample_config, temp_dir):
        """Test parsing space-separated event lists."""
        generator = AsyncAPIGenerator(sample_config)
        services_dir = Path(sample_config['services_dir'])

        service_dir = services_dir / "service-space"
        service_dir.mkdir()
        service_file = service_dir / "index.md"
        service_file.write_text("""---
title: Space Service
events-raised: event1 event2 event3
---

Service with space-separated events.
""")

        generator.load_services()

        service = generator.services['Space Service']
        assert len(service.events_raised) == 3

    def test_load_service_without_title(self, sample_config, temp_dir):
        """Test handling of service without title."""
        generator = AsyncAPIGenerator(sample_config)
        services_dir = Path(sample_config['services_dir'])

        service_dir = services_dir / "no-title"
        service_dir.mkdir()
        service_file = service_dir / "index.md"
        service_file.write_text("""---
c4type: component
---

Service without title.
""")

        generator.load_services()
        assert len(generator.services) == 0

    def test_load_service_with_parent(self, sample_config, temp_dir):
        """Test loading service with parent reference."""
        generator = AsyncAPIGenerator(sample_config)
        services_dir = Path(sample_config['services_dir'])

        service_dir = services_dir / "child-service"
        service_dir.mkdir()
        service_file = service_dir / "index.md"
        service_file.write_text("""---
title: Child Service
parent: Parent Service
c4type: component
---

Child service description.
""")

        generator.load_services()

        service = generator.services['Child Service']
        assert service.parent == 'Parent Service'


class TestServiceEventParsing:
    """Tests for parsing service event lists in different formats."""

    def test_empty_events_list(self, sample_config, temp_dir):
        """Test service with no events."""
        generator = AsyncAPIGenerator(sample_config)
        services_dir = Path(sample_config['services_dir'])

        service_dir = services_dir / "no-events"
        service_dir.mkdir()
        service_file = service_dir / "index.md"
        service_file.write_text("""---
title: No Events Service
c4type: component
---

Service without events.
""")

        generator.load_services()

        service = generator.services['No Events Service']
        assert service.events_raised == []
        assert service.events_consumed == []
