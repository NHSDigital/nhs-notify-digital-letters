"""
Tests for event loading and parsing functionality.
"""
import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from generate_asyncapi import AsyncAPIGenerator, Event


class TestEventLoading:
    """Tests for loading events from markdown files."""

    def test_load_events_from_directory(self, sample_config, temp_dir):
        """Test loading events from markdown files."""
        generator = AsyncAPIGenerator(sample_config)

        # Create a sample event file
        events_dir = Path(sample_config['events_dir'])
        event_file = events_dir / "test-event.md"
        event_file.write_text("""---
title: test-event
type: uk.nhs.notify.test.v1
nice_name: TestEvent
service: Test Service
schema_envelope: https://example.com/envelope.json
schema_data: https://example.com/data.json
---

This is a test event description.
""")

        generator.load_events()

        assert 'test-event' in generator.events
        event = generator.events['test-event']
        assert event.title == 'test-event'
        assert event.type == 'uk.nhs.notify.test.v1'
        assert event.nice_name == 'TestEvent'
        assert event.service == 'Test Service'
        assert 'test event description' in event.description.lower()

    def test_load_multiple_events(self, sample_config, temp_dir):
        """Test loading multiple event files."""
        generator = AsyncAPIGenerator(sample_config)
        events_dir = Path(sample_config['events_dir'])

        # Create multiple event files
        for i in range(3):
            event_file = events_dir / f"event-{i}.md"
            event_file.write_text(f"""---
title: event-{i}
type: uk.nhs.notify.test.event{i}.v1
nice_name: Event{i}
service: Test Service
schema_envelope: https://example.com/envelope{i}.json
schema_data: https://example.com/data{i}.json
---

Event {i} description.
""")

        generator.load_events()

        assert len(generator.events) == 3
        for i in range(3):
            assert f'event-{i}' in generator.events

    def test_load_events_missing_directory(self, sample_config, temp_dir):
        """Test handling of missing events directory."""
        # Use a non-existent directory
        sample_config['events_dir'] = str(temp_dir / 'nonexistent')
        generator = AsyncAPIGenerator(sample_config)

        # Should not raise an error
        generator.load_events()
        assert generator.events == {}

    def test_load_event_without_frontmatter(self, sample_config, temp_dir):
        """Test handling of markdown files without frontmatter."""
        generator = AsyncAPIGenerator(sample_config)
        events_dir = Path(sample_config['events_dir'])

        event_file = events_dir / "no-frontmatter.md"
        event_file.write_text("Just some content without frontmatter")

        generator.load_events()
        assert 'no-frontmatter' not in generator.events

    def test_load_event_with_minimal_metadata(self, sample_config, temp_dir):
        """Test loading event with minimal required metadata."""
        generator = AsyncAPIGenerator(sample_config)
        events_dir = Path(sample_config['events_dir'])

        event_file = events_dir / "minimal-event.md"
        event_file.write_text("""---
title: minimal-event
type: uk.nhs.notify.minimal.v1
---

Minimal event.
""")

        generator.load_events()
        assert 'minimal-event' in generator.events
        event = generator.events['minimal-event']
        assert event.title == 'minimal-event'
        assert event.type == 'uk.nhs.notify.minimal.v1'
        assert event.nice_name == ''  # Optional field
        assert event.schema_envelope == ''  # Optional field


class TestEventParsing:
    """Tests for parsing event metadata and content."""

    def test_extract_description_from_content(self, sample_config, temp_dir):
        """Test extraction of description from markdown content."""
        generator = AsyncAPIGenerator(sample_config)
        events_dir = Path(sample_config['events_dir'])

        event_file = events_dir / "event-with-description.md"
        event_file.write_text("""---
title: event-with-description
type: uk.nhs.notify.test.v1
---

# Event Title

This is a multi-line description.

It can contain multiple paragraphs.
""")

        generator.load_events()
        event = generator.events['event-with-description']
        assert 'multi-line description' in event.description.lower()
        assert 'multiple paragraphs' in event.description.lower()

    def test_parse_event_type_correctly(self, sample_config):
        """Test that event types are parsed correctly."""
        generator = AsyncAPIGenerator(sample_config)

        content = """---
type: uk.nhs.notify.digital-letters.letter-created.v1
title: letter-created
---
"""
        metadata = generator.parse_frontmatter(content)
        assert metadata['type'] == 'uk.nhs.notify.digital-letters.letter-created.v1'
