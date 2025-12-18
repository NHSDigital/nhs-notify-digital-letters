#!/usr/bin/env python3
"""
AsyncAPI Generator for NHS Notify Digital Letters

This script generates AsyncAPI 3.0 specifications from event definitions,
service architecture, and JSON schemas.
"""
import yaml
import json
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Event:
    """Represents an event definition from markdown frontmatter."""
    title: str
    type: str
    nice_name: str
    service: str
    schema_envelope: str
    schema_data: str
    description: str = ""
    file_path: Optional[Path] = None


@dataclass
class Service:
    """Represents a service/system from architecture definitions."""
    title: str
    parent: Optional[str] = None
    events_raised: List[str] = field(default_factory=list)
    events_consumed: List[str] = field(default_factory=list)
    c4type: Optional[str] = None
    owner: Optional[str] = None
    author: Optional[str] = None
    description: str = ""
    file_path: Optional[Path] = None


class AsyncAPIGenerator:
    """Generates AsyncAPI specifications from NHS Notify event definitions."""

    def __init__(self, config: Dict[str, Any]):
        """Initialize the generator with configuration."""
        self.config = config
        self.events_dir = Path(config.get('events_dir', '../../docs/collections/_events'))
        self.services_dir = Path(config.get('services_dir', '../../docs/architecture/c4/notifhir'))
        self.schemas_dir = Path(config.get('schemas_dir', '../../schemas/digital-letters'))
        self.output_dir = Path(config.get('output_dir', './output'))
        self.schema_base_url = config.get('schema_base_url', 'https://notify.nhs.uk/cloudevents/schemas/digital-letters')

        self.events: Dict[str, Event] = {}
        self.services: Dict[str, Service] = {}

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def parse_frontmatter(self, content: str) -> Dict[str, Any]:
        """Extract YAML frontmatter from markdown content."""
        if not content.startswith('---'):
            return {}

        try:
            # Find the closing ---
            end_idx = content.find('---', 3)
            if end_idx == -1:
                return {}

            frontmatter = content[3:end_idx].strip()
            return yaml.safe_load(frontmatter) or {}
        except Exception as e:
            print(f"Error parsing frontmatter: {e}")
            return {}

    def load_events(self):
        """Load all event definitions from markdown files."""
        print(f"Loading events from {self.events_dir}")

        if not self.events_dir.exists():
            print(f"Warning: Events directory not found: {self.events_dir}")
            return

        event_files = list(self.events_dir.glob("*.md"))
        print(f"Found {len(event_files)} event file(s)")

        for event_file in event_files:
            try:
                with open(event_file, 'r') as f:
                    content = f.read()

                metadata = self.parse_frontmatter(content)
                if not metadata:
                    continue

                # Extract description from content after frontmatter
                end_idx = content.find('---', 3)
                description = content[end_idx + 3:].strip() if end_idx != -1 else ""

                event = Event(
                    title=metadata.get('title', event_file.stem),
                    type=metadata.get('type', ''),
                    nice_name=metadata.get('nice_name', ''),
                    service=metadata.get('service', ''),
                    schema_envelope=metadata.get('schema_envelope', ''),
                    schema_data=metadata.get('schema_data', ''),
                    description=description,
                    file_path=event_file
                )

                self.events[event.title] = event
                print(f"  Loaded event: {event.title} ({event.type})")

            except Exception as e:
                print(f"Error loading event {event_file}: {e}")

    def load_services(self):
        """Load all service definitions from architecture markdown files."""
        print(f"\nLoading services from {self.services_dir}")

        if not self.services_dir.exists():
            print(f"Warning: Services directory not found: {self.services_dir}")
            return

        # Recursively find all index.md files (service definitions)
        service_files = list(self.services_dir.rglob("index.md"))
        print(f"Found {len(service_files)} service file(s)")

        for service_file in service_files:
            try:
                with open(service_file, 'r') as f:
                    content = f.read()

                metadata = self.parse_frontmatter(content)
                if not metadata:
                    continue

                title = metadata.get('title', '')
                if not title:
                    continue

                # Parse events-raised and events-consumed (can be comma or space separated)
                events_raised = metadata.get('events-raised', [])
                if isinstance(events_raised, str):
                    events_raised = [e.strip() for e in events_raised.replace(',', ' ').split() if e.strip()]

                events_consumed = metadata.get('events-consumed', [])
                if isinstance(events_consumed, str):
                    events_consumed = [e.strip() for e in events_consumed.replace(',', ' ').split() if e.strip()]

                # Extract description from content
                end_idx = content.find('---', 3)
                description = content[end_idx + 3:].strip() if end_idx != -1 else ""

                service = Service(
                    title=title,
                    parent=metadata.get('parent'),
                    events_raised=events_raised,
                    events_consumed=events_consumed,
                    c4type=metadata.get('c4type'),
                    owner=metadata.get('owner'),
                    author=metadata.get('author'),
                    description=description,
                    file_path=service_file
                )

                self.services[title] = service
                print(f"  Loaded service: {title} (raises: {len(events_raised)}, consumes: {len(events_consumed)})")

            except Exception as e:
                print(f"Error loading service {service_file}: {e}")

    def generate_channel_for_event(self, event: Event) -> Dict[str, Any]:
        """Generate an AsyncAPI channel definition for an event."""
        # Channel name from event type
        channel_name = event.type.replace('.', '/')

        message = {
            'name': event.nice_name or event.title,
            'title': event.nice_name or event.title,
            'summary': f'Event: {event.type}',
            'description': event.description or f'Event of type {event.type}',
            'contentType': 'application/cloudevents+json',
            'payload': {
                '$ref': event.schema_envelope
            }
        }

        # Add data schema reference as trait
        if event.schema_data:
            message['traits'] = [{
                'description': f'Data schema: {event.schema_data}'
            }]

        channel = {
            'address': channel_name,
            'messages': {
                event.nice_name or event.title: message
            },
            'description': f'{event.service} - {event.type}'
        }

        return channel

    def generate_asyncapi_for_service(self, service: Service) -> Dict[str, Any]:
        """Generate AsyncAPI specification for a single service."""
        info = self.config.get('info', {})

        asyncapi_spec = {
            'asyncapi': self.config.get('asyncapi', {}).get('version', '3.0.0'),
            'info': {
                'title': f"{info.get('title', 'NHS Notify')} - {service.title}",
                'version': info.get('version', '1.0.0'),
                'description': service.description or f'AsyncAPI specification for {service.title}',
            },
            'channels': {},
            'operations': {},
            'components': {
                'messages': {}
            }
        }

        # Add contact and license if present
        if 'contact' in info:
            asyncapi_spec['info']['contact'] = info['contact']
        if 'license' in info:
            asyncapi_spec['info']['license'] = info['license']

        # Add metadata about the service
        asyncapi_spec['info']['x-service-metadata'] = {
            'c4type': service.c4type,
            'owner': service.owner,
            'author': service.author,
            'parent': service.parent
        }

        # Process events raised (send operations)
        for event_title in service.events_raised:
            event = self.events.get(event_title)
            if not event:
                print(f"  Warning: Event '{event_title}' not found for service '{service.title}'")
                continue

            channel = self.generate_channel_for_event(event)
            channel_id = event.type.replace('.', '_')

            asyncapi_spec['channels'][channel_id] = channel

            # Add send operation
            operation_id = f'send_{channel_id}'
            asyncapi_spec['operations'][operation_id] = {
                'action': 'send',
                'channel': {'$ref': f'#/channels/{channel_id}'},
                'summary': f'Send {event.nice_name or event.title}',
                'description': f'{service.title} raises this event',
                'messages': [
                    {'$ref': f'#/channels/{channel_id}/messages/{event.nice_name or event.title}'}
                ]
            }

        # Process events consumed (receive operations)
        for event_title in service.events_consumed:
            event = self.events.get(event_title)
            if not event:
                print(f"  Warning: Event '{event_title}' not found for service '{service.title}'")
                continue

            channel = self.generate_channel_for_event(event)
            channel_id = event.type.replace('.', '_')

            # Add channel if not already present (might be raised and consumed by same service)
            if channel_id not in asyncapi_spec['channels']:
                asyncapi_spec['channels'][channel_id] = channel

            # Add receive operation
            operation_id = f'receive_{channel_id}'
            asyncapi_spec['operations'][operation_id] = {
                'action': 'receive',
                'channel': {'$ref': f'#/channels/{channel_id}'},
                'summary': f'Receive {event.nice_name or event.title}',
                'description': f'{service.title} consumes this event',
                'messages': [
                    {'$ref': f'#/channels/{channel_id}/messages/{event.nice_name or event.title}'}
                ]
            }

        return asyncapi_spec

    def generate_combined_asyncapi(self) -> Dict[str, Any]:
        """Generate a combined AsyncAPI specification for all services."""
        info = self.config.get('info', {})

        asyncapi_spec = {
            'asyncapi': self.config.get('asyncapi', {}).get('version', '3.0.0'),
            'info': {
                'title': info.get('title', 'NHS Notify Digital Letters'),
                'version': info.get('version', '1.0.0'),
                'description': info.get('description', 'Complete event-driven architecture'),
            },
            'channels': {},
            'operations': {},
            'components': {
                'messages': {},
                'schemas': {}
            }
        }

        # Add contact and license if present
        if 'contact' in info:
            asyncapi_spec['info']['contact'] = info['contact']
        if 'license' in info:
            asyncapi_spec['info']['license'] = info['license']

        # Collect all unique events
        all_event_types = set()
        service_operations = []

        for service in self.services.values():
            for event_title in service.events_raised + service.events_consumed:
                event = self.events.get(event_title)
                if event:
                    all_event_types.add(event.type)
                    service_operations.append({
                        'service': service.title,
                        'event': event,
                        'action': 'send' if event_title in service.events_raised else 'receive'
                    })

        # Generate channels for all unique events
        processed_events = set()
        for event in self.events.values():
            if event.type in all_event_types and event.type not in processed_events:
                channel = self.generate_channel_for_event(event)
                channel_id = event.type.replace('.', '_')
                asyncapi_spec['channels'][channel_id] = channel
                processed_events.add(event.type)

        # Generate operations for each service
        for idx, op in enumerate(service_operations):
            service = op['service']
            event = op['event']
            action = op['action']
            channel_id = event.type.replace('.', '_')

            operation_id = f"{action}_{channel_id}_by_{service.replace(' ', '_').lower()}_{idx}"
            asyncapi_spec['operations'][operation_id] = {
                'action': action,
                'channel': {'$ref': f'#/channels/{channel_id}'},
                'summary': f'{service} {action}s {event.nice_name or event.title}',
                'description': f'{service} {"raises" if action == "send" else "consumes"} this event',
                'messages': [
                    {'$ref': f'#/channels/{channel_id}/messages/{event.nice_name or event.title}'}
                ]
            }

        return asyncapi_spec

    def generate(self, service_filter: Optional[str] = None):
        """Generate AsyncAPI specifications."""
        print("=" * 80)
        print("NHS Notify Digital Letters - AsyncAPI Generator")
        print("=" * 80)

        # Load data
        self.load_events()
        self.load_services()

        print(f"\nLoaded {len(self.events)} events and {len(self.services)} services")

        # Generate per-service specs
        if self.config.get('generate_per_service', True):
            print("\n" + "=" * 80)
            print("Generating AsyncAPI specifications per service")
            print("=" * 80)

            services_to_generate = self.services.values()
            if service_filter:
                services_to_generate = [s for s in services_to_generate if s.title == service_filter]
                if not services_to_generate:
                    print(f"Error: Service '{service_filter}' not found")
                    return

            for service in services_to_generate:
                # Only generate for services that have events
                if not service.events_raised and not service.events_consumed:
                    print(f"Skipping {service.title} (no events)")
                    continue

                print(f"\nGenerating AsyncAPI for: {service.title}")
                asyncapi_spec = self.generate_asyncapi_for_service(service)

                # Write to file
                filename = f"asyncapi-{service.title.lower().replace(' ', '-')}.yaml"
                output_file = self.output_dir / filename

                with open(output_file, 'w') as f:
                    yaml.dump(asyncapi_spec, f, default_flow_style=False, sort_keys=False)

                print(f"  ✓ Generated: {output_file}")
                print(f"    - Channels: {len(asyncapi_spec['channels'])}")
                print(f"    - Operations: {len(asyncapi_spec['operations'])}")

        # Generate combined spec
        if self.config.get('generate_combined', True) and not service_filter:
            print("\n" + "=" * 80)
            print("Generating combined AsyncAPI specification")
            print("=" * 80)

            asyncapi_spec = self.generate_combined_asyncapi()
            output_file = self.output_dir / "asyncapi-all.yaml"

            with open(output_file, 'w') as f:
                yaml.dump(asyncapi_spec, f, default_flow_style=False, sort_keys=False)

            print(f"  ✓ Generated: {output_file}")
            print(f"    - Channels: {len(asyncapi_spec['channels'])}")
            print(f"    - Operations: {len(asyncapi_spec['operations'])}")

        print("\n" + "=" * 80)
        print("Generation complete!")
        print("=" * 80)


def load_config(config_file: Optional[str] = None) -> Dict[str, Any]:
    """Load configuration from file or use defaults."""
    default_config = {
        'events_dir': '../../docs/collections/_events',
        'services_dir': '../../docs/architecture/c4/notifhir',
        'schemas_dir': '../../schemas/digital-letters',
        'output_dir': './output',
        'schema_base_url': 'https://notify.nhs.uk/cloudevents/schemas/digital-letters',
        'generate_per_service': True,
        'generate_combined': True,
        'asyncapi': {
            'version': '3.0.0'
        },
        'info': {
            'title': 'NHS Notify Digital Letters',
            'version': '2025-10-draft',
            'description': 'Event-driven architecture for NHS Notify Digital Letters system',
        }
    }

    if config_file:
        config_path = Path(config_file)
        if config_path.exists():
            with open(config_path, 'r') as f:
                user_config = yaml.safe_load(f)
                # Merge with defaults
                default_config.update(user_config)

    return default_config


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Generate AsyncAPI specifications from NHS Notify event definitions'
    )
    parser.add_argument(
        '--config',
        type=str,
        help='Path to configuration YAML file'
    )
    parser.add_argument(
        '--events-dir',
        type=str,
        help='Path to events directory'
    )
    parser.add_argument(
        '--services-dir',
        type=str,
        help='Path to services directory'
    )
    parser.add_argument(
        '--schemas-dir',
        type=str,
        help='Path to schemas directory'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        help='Output directory for AsyncAPI specs'
    )
    parser.add_argument(
        '--service',
        type=str,
        help='Generate AsyncAPI for a specific service only'
    )

    args = parser.parse_args()

    # Load configuration
    config = load_config(args.config)

    # Override with command line arguments
    if args.events_dir:
        config['events_dir'] = args.events_dir
    if args.services_dir:
        config['services_dir'] = args.services_dir
    if args.schemas_dir:
        config['schemas_dir'] = args.schemas_dir
    if args.output_dir:
        config['output_dir'] = args.output_dir

    # Generate AsyncAPI
    generator = AsyncAPIGenerator(config)
    generator.generate(service_filter=args.service)


if __name__ == '__main__':
    main()
