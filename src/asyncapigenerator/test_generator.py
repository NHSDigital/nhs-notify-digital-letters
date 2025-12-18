#!/usr/bin/env python3
"""
Simple tests for the AsyncAPI Generator

Run with: python test_generator.py
"""
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from generate_asyncapi import AsyncAPIGenerator, Event, Service


def test_parse_frontmatter():
    """Test frontmatter parsing."""
    print("Testing frontmatter parsing...")

    generator = AsyncAPIGenerator({
        'events_dir': '.',
        'services_dir': '.',
        'schemas_dir': '.',
        'output_dir': './test-output',
    })

    # Test valid frontmatter
    content = """---
title: test-event
type: uk.nhs.notify.test.v1
service: Test Service
---

This is content.
"""

    result = generator.parse_frontmatter(content)
    assert result['title'] == 'test-event', "Failed to parse title"
    assert result['type'] == 'uk.nhs.notify.test.v1', "Failed to parse type"
    print("  ✓ Valid frontmatter parsed correctly")

    # Test invalid frontmatter
    content_no_fm = "No frontmatter here"
    result = generator.parse_frontmatter(content_no_fm)
    assert result == {}, "Should return empty dict for no frontmatter"
    print("  ✓ Invalid frontmatter handled correctly")


def test_event_creation():
    """Test Event dataclass."""
    print("\nTesting Event creation...")

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
    print("  ✓ Event created successfully")


def test_service_creation():
    """Test Service dataclass."""
    print("\nTesting Service creation...")

    service = Service(
        title='Test Service',
        events_raised=['event1', 'event2'],
        events_consumed=['event3'],
        c4type='component',
        owner='Test Owner'
    )

    assert len(service.events_raised) == 2
    assert len(service.events_consumed) == 1
    print("  ✓ Service created successfully")


def test_channel_generation():
    """Test channel generation from event."""
    print("\nTesting channel generation...")

    generator = AsyncAPIGenerator({
        'events_dir': '.',
        'services_dir': '.',
        'schemas_dir': '.',
        'output_dir': './test-output',
    })

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
    print("  ✓ Channel generated correctly")
    print(f"    Address: {channel['address']}")


def test_asyncapi_generation():
    """Test AsyncAPI spec generation for a service."""
    print("\nTesting AsyncAPI spec generation...")

    config = {
        'events_dir': '.',
        'services_dir': '.',
        'schemas_dir': '.',
        'output_dir': './test-output',
        'asyncapi': {'version': '3.0.0'},
        'info': {
            'title': 'Test System',
            'version': '1.0.0',
            'description': 'Test system'
        }
    }

    generator = AsyncAPIGenerator(config)

    # Create test event and service
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
        events_consumed=['other-event'],
        c4type='component'
    )

    generator.events = {'test-event': event}
    generator.services = {'Test Service': service}

    spec = generator.generate_asyncapi_for_service(service)

    assert spec['asyncapi'] == '3.0.0'
    assert 'Test Service' in spec['info']['title']
    assert 'channels' in spec
    assert 'operations' in spec
    print("  ✓ AsyncAPI spec generated correctly")
    print(f"    Channels: {len(spec['channels'])}")
    print(f"    Operations: {len(spec['operations'])}")


def run_all_tests():
    """Run all tests."""
    print("=" * 60)
    print("AsyncAPI Generator Tests")
    print("=" * 60)

    try:
        test_parse_frontmatter()
        test_event_creation()
        test_service_creation()
        test_channel_generation()
        test_asyncapi_generation()

        print("\n" + "=" * 60)
        print("✓ All tests passed!")
        print("=" * 60)
        return 0

    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        return 1
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(run_all_tests())
