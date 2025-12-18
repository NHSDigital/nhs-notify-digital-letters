#!/usr/bin/env python3
"""
Example usage of the AsyncAPI Generator

This script demonstrates various ways to use the AsyncAPI generator.
"""
import sys
from pathlib import Path

# Add the parent directory to the path so we can import generate_asyncapi
sys.path.insert(0, str(Path(__file__).parent))

from generate_asyncapi import AsyncAPIGenerator, load_config


def example_basic():
    """Basic example - generate all AsyncAPI specs with default config."""
    print("Example 1: Basic usage with default config")
    print("-" * 60)

    config = load_config('config.yaml')
    generator = AsyncAPIGenerator(config)
    generator.generate()


def example_custom_paths():
    """Example with custom paths."""
    print("\nExample 2: Custom paths")
    print("-" * 60)

    config = {
        'events_dir': '/custom/path/to/events',
        'services_dir': '/custom/path/to/services',
        'schemas_dir': '/custom/path/to/schemas',
        'output_dir': './custom-output',
        'generate_per_service': True,
        'generate_combined': True,
        'asyncapi': {'version': '3.0.0'},
        'info': {
            'title': 'My Event System',
            'version': '1.0.0',
            'description': 'Custom event-driven architecture'
        }
    }

    generator = AsyncAPIGenerator(config)
    # generator.generate()  # Uncomment to run


def example_single_service():
    """Example generating AsyncAPI for a single service."""
    print("\nExample 3: Generate for single service")
    print("-" * 60)

    config = load_config('config.yaml')
    generator = AsyncAPIGenerator(config)
    generator.generate(service_filter='MESH Poller')


def example_programmatic():
    """Example of programmatic access to events and services."""
    print("\nExample 4: Programmatic access")
    print("-" * 60)

    config = load_config('config.yaml')
    generator = AsyncAPIGenerator(config)

    # Load data without generating
    generator.load_events()
    generator.load_services()

    # Access the data
    print(f"Total events: {len(generator.events)}")
    print(f"Total services: {len(generator.services)}")

    # Print some event info
    print("\nSample events:")
    for i, (name, event) in enumerate(generator.events.items()):
        if i >= 3:  # Just show first 3
            break
        print(f"  - {name}: {event.type}")

    # Print services with events
    print("\nServices with events:")
    for name, service in generator.services.items():
        if service.events_raised or service.events_consumed:
            print(f"  - {name}")
            print(f"    Raises: {len(service.events_raised)}")
            print(f"    Consumes: {len(service.events_consumed)}")


if __name__ == '__main__':
    # Run the examples
    example_basic()
    # example_custom_paths()  # Uncomment to run
    # example_single_service()  # Uncomment to run
    # example_programmatic()  # Uncomment to run
