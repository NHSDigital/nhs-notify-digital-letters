#!/usr/bin/env python3
"""
AsyncAPI to EventCatalog Importer

This script imports AsyncAPI specifications into EventCatalog structure.
It creates domains, services, channels, and events based on AsyncAPI definitions.
"""

import argparse
import json
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import yaml


class AsyncAPIImporter:
    """Imports AsyncAPI specifications into EventCatalog structure."""

    def __init__(
        self,
        asyncapi_dir: Path,
        eventcatalog_dir: Path,
        parent_domain_name: str = "Digital Letters",
        verbose: bool = False,
        schema_base_path: Optional[Path] = None,
    ):
        """
        Initialize the importer.

        Args:
            asyncapi_dir: Directory containing AsyncAPI YAML files
            eventcatalog_dir: EventCatalog root directory
            parent_domain_name: Name of the parent domain (subdomains will be created under this)
            verbose: Enable verbose logging
            schema_base_path: Base path for schema files on local filesystem
        """
        self.asyncapi_dir = Path(asyncapi_dir)
        self.eventcatalog_dir = Path(eventcatalog_dir)
        self.parent_domain_name = parent_domain_name
        self.verbose = verbose
        self.schema_base_path = Path(
            schema_base_path) if schema_base_path else None

        # Create base directories
        self.domains_dir = self.eventcatalog_dir / "domains"
        self.channels_dir = self.eventcatalog_dir / "channels"

        # Track created resources to avoid duplicates
        self.created_services: Set[str] = set()
        self.created_events: Set[str] = set()
        self.created_channels: Set[str] = set()
        self.created_parent_domain: bool = False

        # Track relationships for updating frontmatter
        # subdomain -> list of services
        self.subdomain_services: Dict[str, List[Dict[str, str]]] = {}
        # service -> {sends: [], receives: []}
        self.service_events: Dict[str, Dict[str, List[Dict[str, str]]]] = {}
        # Track all subdomains created
        self.created_subdomains: Dict[str, str] = {}  # slug -> version

        # Track errors
        self.errors: List[str] = []

    def log(self, message: str, level: str = "INFO") -> None:
        """Log a message."""
        if self.verbose or level in ["ERROR", "WARNING"]:
            print(f"[{level}] {message}")

        # Track errors for later reporting
        if level == "ERROR":
            self.errors.append(message)

    def load_asyncapi_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Load and parse an AsyncAPI YAML file."""
        try:
            with open(file_path, "r") as f:
                data = yaml.safe_load(f)
            self.log(f"Loaded AsyncAPI file: {file_path.name}")
            return data
        except Exception as e:
            self.log(f"Error loading {file_path}: {e}", "ERROR")
            return None

    def sanitize_name(self, name: str) -> str:
        """Sanitize a name for use in file paths and IDs."""
        # Convert to lowercase, replace spaces and special chars with hyphens
        sanitized = re.sub(r"[^a-z0-9]+", "-", name.lower())
        # Remove leading/trailing hyphens
        sanitized = sanitized.strip("-")
        return sanitized

    def extract_service_name(self, asyncapi_data: Dict[str, Any]) -> str:
        """Extract service name from AsyncAPI specification."""
        info = asyncapi_data.get("info", {})
        title = info.get("title", "Unknown Service")
        # Remove common prefixes
        title = title.replace("NHS Notify Digital Letters - ", "")
        return title

    def extract_subdomain_from_service(
        self, service_name: str, asyncapi_data: Dict[str, Any]
    ) -> str:
        """Extract subdomain name from service metadata or name."""
        info = asyncapi_data.get("info", {})
        metadata = info.get("x-service-metadata", {})
        parent = metadata.get("parent", "")

        if parent:
            return parent

        # Fallback to parsing service name
        if "mesh" in service_name.lower():
            return "MESH Services"
        elif "pdm" in service_name.lower():
            return "PDM Services"
        elif "reporting" in service_name.lower():
            return "Reporting"
        else:
            return "Core Services"

    def create_parent_domain_structure(self) -> Path:
        """Create parent domain directory structure."""
        if self.created_parent_domain:
            return self.domains_dir / self.sanitize_name(self.parent_domain_name)

        parent_domain_slug = self.sanitize_name(self.parent_domain_name)
        parent_domain_path = self.domains_dir / parent_domain_slug

        if not parent_domain_path.exists():
            parent_domain_path.mkdir(parents=True, exist_ok=True)

            # Create index.mdx for parent domain
            index_content = f"""---
id: {parent_domain_slug}
name: {self.parent_domain_name}
version: 0.0.1
summary: |
    {self.parent_domain_name} parent domain
---

## Overview

This domain contains subdomains related to {self.parent_domain_name}.

<NodeGraph />
"""
            index_file = parent_domain_path / "index.mdx"
            with open(index_file, "w") as f:
                f.write(index_content)

            self.log(f"Created parent domain: {self.parent_domain_name}")
            self.created_parent_domain = True

        return parent_domain_path

    def create_subdomain_structure(self, subdomain_name: str) -> Path:
        """Create subdomain directory structure under parent domain."""
        # First ensure parent domain exists
        parent_domain_path = self.create_parent_domain_structure()

        subdomain_slug = self.sanitize_name(subdomain_name)
        subdomains_dir = parent_domain_path / "subdomains"
        subdomains_dir.mkdir(parents=True, exist_ok=True)

        subdomain_path = subdomains_dir / subdomain_slug

        if not subdomain_path.exists():
            subdomain_path.mkdir(parents=True, exist_ok=True)

            # Create index.mdx for subdomain
            index_content = f"""---
id: {subdomain_slug}
name: {subdomain_name}
version: 0.0.1
summary: |
    {subdomain_name} subdomain
---

## Overview

This subdomain contains services related to {subdomain_name}.

<NodeGraph />
"""
            index_file = subdomain_path / "index.mdx"
            with open(index_file, "w") as f:
                f.write(index_content)

            self.log(f"Created subdomain: {subdomain_name}")

        # Track the subdomain for parent domain relationships
        self.created_subdomains[subdomain_slug] = "0.0.1"

        return subdomain_path

    def create_domain_structure(self, domain_name: str) -> Path:
        """DEPRECATED: Use create_subdomain_structure instead. Kept for backward compatibility."""
        return self.create_subdomain_structure(domain_name)

    def create_service_structure(
        self, subdomain_path: Path, service_name: str, asyncapi_data: Dict[str, Any], subdomain_name: str = None
    ) -> Path:
        """Create service directory structure under a subdomain."""
        service_slug = self.sanitize_name(service_name)
        # Services should be under a 'services' folder within the subdomain
        # Structure: domains/{Parent Domain}/subdomains/{Subdomain}/services/{Service Name}/
        services_dir = subdomain_path / "services"
        services_dir.mkdir(parents=True, exist_ok=True)
        service_path = services_dir / service_slug

        # Always create/update service files (don't skip if already processed)
        service_path.mkdir(parents=True, exist_ok=True)

        info = asyncapi_data.get("info", {})
        description = info.get("description", f"{service_name} service")
        version = info.get("version", "0.0.1")
        metadata = info.get("x-service-metadata", {})

        # Convert non-semver versions to semver (EventCatalog expects semver)
        # If version is a date like "2025-10-draft", use "1.0.0" instead
        if not version or not version[0].isdigit() or version.count('.') != 2:
            version = "1.0.0"

        # Create index.mdx for service
        index_content = f"""---
id: {service_slug}
name: {service_name}
version: {version}
summary: |
    {description}
"""

        # Add owners if available
        if metadata.get("owner"):
            index_content += f"owners:\n  - {metadata['owner']}\n"

        index_content += f"""---

## Overview

{description}

## Architecture

<NodeGraph />
"""

        index_file = service_path / "index.mdx"
        with open(index_file, "w") as f:
            f.write(index_content)

        self.created_services.add(service_slug)
        self.log(f"Created service: {service_name}")

        return service_path

    def create_event_structure(
        self,
        service_path: Path,
        event_name: str,
        channel_address: str,
        message_data: Dict[str, Any],
        action: str,
    ) -> None:
        """Create event structure within a service."""
        event_slug = self.sanitize_name(event_name)
        events_dir = service_path / "events"
        events_dir.mkdir(exist_ok=True)

        event_key = f"{service_path.name}/{event_slug}"
        if event_key in self.created_events:
            self.log(f"Event already exists: {event_name}", "DEBUG")
            return

        # Extract event details
        summary = message_data.get("summary", event_name)
        description = message_data.get("description", "")
        content_type = message_data.get(
            "contentType", "application/cloudevents+json")

        # Determine if it's a published or subscribed event
        event_type = "published" if action == "send" else "received"

        # Extract schema path if available
        payload = message_data.get("payload", {})
        schema_path = payload.get("$ref", "")

        # Strip the https://notify.nhs.uk/cloudevents prefix to make it relative
        if schema_path:
            schema_path = schema_path.replace(
                "https://notify.nhs.uk/cloudevents", "")

            # Switch so bundled version is used
            if ".bundle.schema.json" not in schema_path:
                schema_path = schema_path.replace(".schema.json", ".bundle.schema.json")

        # Create event folder and index.mdx (EventCatalog expects events/eventname/index.mdx)
        event_dir = events_dir / event_slug
        event_dir.mkdir(parents=True, exist_ok=True)

        # Copy schema file to event directory if schema_base_path is provided
        schema_filename = None
        bundled_schema_filename = None
        data_schema_filename = None
        data_schema_path = None

        if schema_path and self.schema_base_path:
            # Get just the path part (remove leading slash for joining)
            relative_schema_path = schema_path.lstrip("/")
            source_schema_file = self.schema_base_path / relative_schema_path

            if source_schema_file.exists():
                schema_filename = source_schema_file.name
                dest_schema_file = event_dir / schema_filename
                try:
                    shutil.copy2(source_schema_file, dest_schema_file)
                    self.log(f"Copied schema file: {schema_filename}", "DEBUG")

                    # Also copy the bundled version if it exists
                    bundled_schema_file = source_schema_file.parent / \
                        source_schema_file.name.replace(
                            '.schema.', '.bundle.schema.')
                    if bundled_schema_file.exists():
                        bundled_schema_filename = bundled_schema_file.name
                        dest_bundled_schema_file = event_dir / bundled_schema_filename
                        try:
                            shutil.copy2(bundled_schema_file,
                                        dest_bundled_schema_file)
                            self.log(
                                f"Copied bundled schema file: {bundled_schema_filename}", "DEBUG")
                        except Exception as e:
                            self.log(
                                f"Error copying bundled schema file {bundled_schema_file}: {e}", "WARNING")
                            bundled_schema_filename = None

                    # Parse the schema file to look for dataschema
                    try:
                        with open(source_schema_file, 'r') as f:
                            schema_content = json.load(f)

                        # Look for dataschema with const value
                        if "properties" in schema_content and "dataschema" in schema_content["properties"]:
                            dataschema_prop = schema_content["properties"]["dataschema"]
                            if "const" in dataschema_prop:
                                data_schema_url = dataschema_prop["const"]
                                # Strip the prefix to get relative path
                                data_schema_path = data_schema_url.replace(
                                    "https://notify.nhs.uk/cloudevents", "")

                                # Copy the data schema file
                                relative_data_schema_path = data_schema_path.lstrip(
                                    "/")
                                source_data_schema_file = self.schema_base_path / relative_data_schema_path

                                if source_data_schema_file.exists():
                                    data_schema_filename = source_data_schema_file.name
                                    dest_data_schema_file = event_dir / data_schema_filename
                                    try:
                                        shutil.copy2(
                                            source_data_schema_file, dest_data_schema_file)
                                        self.log(
                                            f"Copied data schema file: {data_schema_filename}", "DEBUG")
                                    except Exception as e:
                                        self.log(
                                            f"Error copying data schema file:\n  File: {source_data_schema_file}\n  Error: {e}\n  Referenced by: event '{event_name}' in service '{service_path.name}'", "ERROR")
                                        data_schema_filename = None
                                else:
                                    self.log(
                                        f"Data schema file not found:\n  File: {source_data_schema_file}\n  Referenced by: event '{event_name}' in service '{service_path.name}'", "ERROR")
                    except Exception as e:
                        self.log(
                            f"Error parsing schema file:\n  File: {source_schema_file}\n  Error: {e}\n  Referenced by: event '{event_name}' in service '{service_path.name}'", "ERROR")

                except Exception as e:
                    self.log(
                        f"Error copying schema file:\n  File: {source_schema_file}\n  Error: {e}\n  Referenced by: event '{event_name}' in service '{service_path.name}'", "ERROR")
                    schema_filename = None
            else:
                self.log(
                    f"Schema file not found:\n  File: {source_schema_file}\n  Referenced by: event '{event_name}' in service '{service_path.name}'", "ERROR")

        # Create event markdown file
        frontmatter_parts = [
            f"id: {event_slug}",
            f"name: {event_name}",
            f"version: 1.0.0",
            f"summary: |\n  {summary}"
        ]

        # Use bundled schema if available, otherwise use regular schema
        schema_path_for_frontmatter = bundled_schema_filename if bundled_schema_filename else schema_filename
        if schema_path_for_frontmatter:
            frontmatter_parts.append(
                f"schemaPath: {schema_path_for_frontmatter}")

        event_content = f"""---
{chr(10).join(frontmatter_parts)}
---

## Overview

{description}

**Channel**: `{channel_address}`

**Content Type**: `{content_type}`

**Event Type**: {event_type.capitalize()}
"""

        # Add schema reference if available
        if schema_path:
            event_content += f"""
## Schema
"""

            # Add data schema reference first if available
            if data_schema_filename:
                event_content += f"""
Data Schema Reference: [{data_schema_path}]({data_schema_path})
"""

            # Add envelope schema reference
            if schema_filename:
                event_content += f"""
Schema Reference: [{schema_path}]({schema_path})
"""

            # Add data schema components if we successfully copied the data schema file
            if data_schema_filename:
                event_content += f"""
### Data Schema

<!-- Renders the given schema into the page, as a JSON code block -->
<Schema file="{data_schema_filename}" />

<!-- Renders the given schema into the page using a nice Schema component -->
<SchemaViewer file="{data_schema_filename}" />
"""

            # Add envelope schema components if we successfully copied the schema file
            if schema_filename:
                event_content += f"""
### Envelope Schema

<!-- Renders the given schema into the page, as a JSON code block -->
<Schema file="{schema_filename}" />

<!-- Renders the given schema into the page using a nice Schema component -->
<SchemaViewer file="{schema_filename}" />
"""

        event_file = event_dir / "index.mdx"
        with open(event_file, "w") as f:
            f.write(event_content)

        self.created_events.add(event_key)
        self.log(f"Created event: {event_name} ({event_type})")

    def create_channel_structure(
        self, channel_name: str, channel_data: Dict[str, Any]
    ) -> None:
        """Create channel structure."""
        channel_slug = self.sanitize_name(channel_name)

        if channel_slug in self.created_channels:
            self.log(f"Channel already exists: {channel_name}", "DEBUG")
            return

        self.channels_dir.mkdir(exist_ok=True)

        address = channel_data.get("address", channel_name)
        description = channel_data.get(
            "description", f"Channel: {channel_name}")

        # Create channel folder and index.mdx (EventCatalog expects channels/channelname/index.mdx)
        channel_dir = self.channels_dir / channel_slug
        channel_dir.mkdir(parents=True, exist_ok=True)

        # Create channel markdown file
        channel_content = f"""---
id: {channel_slug}
name: {channel_name}
version: 1.0.0
address: {address}
summary: |
    {description}
---

## Overview

{description}

**Address**: `{address}`

## Messages

This channel carries the following messages:

"""

        # Add message references
        messages = channel_data.get("messages", {})
        for msg_name, msg_data in messages.items():
            msg_summary = msg_data.get("summary", msg_name)
            channel_content += f"- **{msg_name}**: {msg_summary}\n"

        channel_file = channel_dir / "index.mdx"
        with open(channel_file, "w") as f:
            f.write(channel_content)

        self.created_channels.add(channel_slug)
        self.log(f"Created channel: {channel_name}")

    def process_asyncapi_file(self, file_path: Path) -> None:
        """Process a single AsyncAPI file."""
        self.log(f"\nProcessing: {file_path.name}")

        asyncapi_data = self.load_asyncapi_file(file_path)
        if not asyncapi_data:
            return

        # Extract service information
        service_name = self.extract_service_name(asyncapi_data)
        subdomain_name = self.extract_subdomain_from_service(
            service_name, asyncapi_data)
        service_slug = self.sanitize_name(service_name)
        subdomain_slug = self.sanitize_name(subdomain_name)

        # Create subdomain structure (which also creates parent domain)
        subdomain_path = self.create_subdomain_structure(subdomain_name)

        # Create service structure
        service_path = self.create_service_structure(
            subdomain_path, service_name, asyncapi_data, subdomain_name
        )

        # Track subdomain-service relationship
        if subdomain_slug not in self.subdomain_services:
            self.subdomain_services[subdomain_slug] = []

        # Add service to subdomain if not already there
        # Normalize version to semver (EventCatalog expects semver)
        raw_version = asyncapi_data.get("info", {}).get("version", "0.0.1")
        if not raw_version or not raw_version[0].isdigit() or raw_version.count('.') != 2:
            raw_version = "1.0.0"

        service_ref = {"id": service_slug, "version": raw_version}
        if service_ref not in self.subdomain_services[subdomain_slug]:
            self.subdomain_services[subdomain_slug].append(service_ref)

        # Initialize service events tracking
        if service_slug not in self.service_events:
            self.service_events[service_slug] = {"sends": [], "receives": []}

        # Process channels
        channels = asyncapi_data.get("channels", {})
        for channel_name, channel_data in channels.items():
            self.create_channel_structure(channel_name, channel_data)

        # Process operations to create events
        operations = asyncapi_data.get("operations", {})
        for op_name, op_data in operations.items():
            action = op_data.get("action", "")
            channel_ref = op_data.get("channel", {}).get("$ref", "")

            # Extract channel name from reference
            if channel_ref.startswith("#/channels/"):
                channel_name = channel_ref.replace("#/channels/", "")
                channel_data = channels.get(channel_name, {})

                # Get messages
                messages_data = channel_data.get("messages", {})
                for msg_name, msg_data in messages_data.items():
                    # Get full message data if it's a reference
                    if "$ref" in msg_data:
                        msg_ref = msg_data["$ref"]
                        if msg_ref.startswith(f"#/channels/{channel_name}/messages/"):
                            msg_data = messages_data.get(msg_name, msg_data)

                    channel_address = channel_data.get("address", channel_name)
                    event_slug = self.sanitize_name(msg_name)

                    # Track service-event relationship
                    event_ref = {"id": event_slug, "version": "1.0.0"}
                    if action == "send":
                        if event_ref not in self.service_events[service_slug]["sends"]:
                            self.service_events[service_slug]["sends"].append(
                                event_ref)
                    else:
                        if event_ref not in self.service_events[service_slug]["receives"]:
                            self.service_events[service_slug]["receives"].append(
                                event_ref)

                    self.create_event_structure(
                        service_path, msg_name, channel_address, msg_data, action
                    )

    def update_subdomain_relationships(self) -> None:
        """Update subdomain index files with service relationships."""
        self.log("\nUpdating subdomain relationships...")

        parent_domain_slug = self.sanitize_name(self.parent_domain_name)

        for subdomain_slug, services in self.subdomain_services.items():
            subdomain_path = self.domains_dir / parent_domain_slug / \
                "subdomains" / subdomain_slug / "index.mdx"
            if not subdomain_path.exists():
                self.log(
                    f"Subdomain file not found: {subdomain_path}", "WARNING")
                continue

            # Read existing content
            with open(subdomain_path, "r") as f:
                content = f.read()

            # Split frontmatter and markdown
            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) >= 3:
                    frontmatter = parts[1]
                    markdown_content = parts[2]

                    # Remove existing services section if present
                    import re
                    frontmatter = re.sub(
                        r'\nservices:.*?(?=\n\w+:|$)', '', frontmatter, flags=re.DOTALL)

                    # Add updated services list
                    services_yaml = "\nservices:\n"
                    for service in services:
                        services_yaml += f"  - id: {service['id']}\n"
                        services_yaml += f"    version: {service['version']}\n"

                    frontmatter += services_yaml

                    # Write back
                    new_content = f"---{frontmatter}---{markdown_content}"
                    with open(subdomain_path, "w") as f:
                        f.write(new_content)

                    self.log(
                        f"Updated subdomain: {subdomain_slug} with {len(services)} services")

    def update_domain_relationships(self) -> None:
        """DEPRECATED: Use update_subdomain_relationships instead. Kept for backward compatibility."""
        self.update_subdomain_relationships()

    def update_parent_domain_relationships(self) -> None:
        """Update parent domain index file with subdomain relationships."""
        self.log("\nUpdating parent domain with subdomains...")

        parent_domain_slug = self.sanitize_name(self.parent_domain_name)
        parent_domain_path = self.domains_dir / parent_domain_slug / "index.mdx"

        if not parent_domain_path.exists():
            self.log(f"Parent domain file not found: {parent_domain_path}", "WARNING")
            return

        # Read existing content
        with open(parent_domain_path, "r") as f:
            content = f.read()

        # Split frontmatter and markdown
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                frontmatter = parts[1]
                markdown_content = parts[2]

                # Remove existing domains section if present
                import re
                frontmatter = re.sub(
                    r'\ndomains:.*?(?=\n\w+:|$)', '', frontmatter, flags=re.DOTALL)

                # Add updated domains list (subdomains are referenced as "domains" in EventCatalog)
                if self.created_subdomains:
                    domains_yaml = "\ndomains:\n"
                    for subdomain_slug in sorted(self.created_subdomains.keys()):
                        version = self.created_subdomains[subdomain_slug]
                        domains_yaml += f"  - id: {subdomain_slug}\n"
                        domains_yaml += f"    version: {version}\n"

                    frontmatter += domains_yaml

                # Write back
                new_content = f"---{frontmatter}---{markdown_content}"
                with open(parent_domain_path, "w") as f:
                    f.write(new_content)

                self.log(f"Updated parent domain with {len(self.created_subdomains)} subdomains")

    def update_service_relationships(self) -> None:
        """Update service index files with event relationships."""
        self.log("\nUpdating service relationships...")

        parent_domain_slug = self.sanitize_name(self.parent_domain_name)
        parent_domain_path = self.domains_dir / parent_domain_slug

        for service_slug, events in self.service_events.items():
            # Find the service file - search in all subdomains
            service_file = None

            # Check if parent domain has subdomains directory
            subdomains_dir = parent_domain_path / "subdomains"
            if subdomains_dir.exists():
                for subdomain_dir in subdomains_dir.glob("*"):
                    if not subdomain_dir.is_dir():
                        continue
                    services_dir = subdomain_dir / "services"
                    if not services_dir.exists():
                        continue
                    potential_file = services_dir / service_slug / "index.mdx"
                    if potential_file.exists():
                        service_file = potential_file
                        break

            if not service_file:
                self.log(
                    f"Service file not found for: {service_slug}", "WARNING")
                continue

            # Read existing content
            with open(service_file, "r") as f:
                content = f.read()

            # Split frontmatter and markdown
            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) >= 3:
                    frontmatter = parts[1]
                    markdown_content = parts[2]

                    needs_update = False

                    # Add receives if not already there
                    if events["receives"] and "receives:" not in frontmatter:
                        receives_yaml = "\nreceives:\n"
                        for event in events["receives"]:
                            receives_yaml += f"  - id: {event['id']}\n"
                            receives_yaml += f"    version: {event['version']}\n"
                        frontmatter += receives_yaml
                        needs_update = True

                    # Add sends if not already there
                    if events["sends"] and "sends:" not in frontmatter:
                        sends_yaml = "\nsends:\n"
                        for event in events["sends"]:
                            sends_yaml += f"  - id: {event['id']}\n"
                            sends_yaml += f"    version: {event['version']}\n"
                        frontmatter += sends_yaml
                        needs_update = True

                    if needs_update:
                        # Write back
                        new_content = f"---{frontmatter}---{markdown_content}"
                        with open(service_file, "w") as f:
                            f.write(new_content)

                        self.log(
                            f"Updated service: {service_slug} with {len(events['sends'])} sends, {len(events['receives'])} receives")

    def import_all(self) -> None:
        """Import all AsyncAPI files from the directory."""
        if not self.asyncapi_dir.exists():
            self.log(
                f"AsyncAPI directory not found: {self.asyncapi_dir}", "ERROR")
            sys.exit(1)

        # Find all AsyncAPI YAML files
        yaml_files = list(self.asyncapi_dir.glob("asyncapi-*.yaml"))

        if not yaml_files:
            self.log(
                f"No AsyncAPI files found in {self.asyncapi_dir}", "WARNING"
            )
            return

        self.log(f"Found {len(yaml_files)} AsyncAPI files to process\n")

        # Process each file
        for yaml_file in sorted(yaml_files):
            # Skip the 'all' file as it's a combined view
            if yaml_file.name == "asyncapi-all.yaml":
                self.log(f"Skipping combined file: {yaml_file.name}")
                continue

            self.process_asyncapi_file(yaml_file)

        # Update relationships in frontmatter
        self.update_parent_domain_relationships()
        self.update_domain_relationships()
        self.update_service_relationships()

        # Print summary
        self.log(f"\n{'='*60}")
        self.log("Import Summary:")
        self.log(f"  Services created: {len(self.created_services)}")
        self.log(f"  Events created: {len(self.created_events)}")
        self.log(f"  Channels created: {len(self.created_channels)}")
        self.log(f"{'='*60}")

        # Check for errors and fail if any were encountered
        if self.errors:
            # Print error summary directly (not via log to avoid infinite loop)
            print(f"\n[ERROR] {'='*60}")
            print(f"[ERROR] Import completed with {len(self.errors)} error(s):")
            for error in self.errors:
                print(f"[ERROR]   - {error}")
            print(f"[ERROR] {'='*60}")
            raise RuntimeError(f"Import failed with {len(self.errors)} error(s). See above for details.")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Import AsyncAPI specifications into EventCatalog",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Basic usage with default paths
    python import_asyncapi.py

    # Custom paths
    python import_asyncapi.py \\
        --asyncapi-dir /path/to/asyncapi/output \\
        --eventcatalog-dir /path/to/eventcatalog

    # Verbose output
    python import_asyncapi.py --verbose

    # Custom parent domain name
    python import_asyncapi.py --parent-domain "My Parent Domain"
        """,
    )

    # Get script directory for default paths
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent.parent

    parser.add_argument(
        "--asyncapi-dir",
        type=str,
        default=str(repo_root / "src/asyncapigenerator/output"),
        help="Directory containing AsyncAPI YAML files (default: src/asyncapigenerator/output)",
    )

    parser.add_argument(
        "--eventcatalog-dir",
        type=str,
        default=str(repo_root / "src/eventcatalog/digital-letters"),
        help="EventCatalog root directory (default: src/eventcatalog/digital-letters)",
    )

    parser.add_argument(
        "--parent-domain",
        type=str,
        default="Digital Letters",
        help="Name of the parent domain (subdomains will be created under this) (default: Digital Letters)",
    )

    parser.add_argument(
        "--domain",
        type=str,
        default=None,
        help="DEPRECATED: Use --parent-domain instead",
    )

    parser.add_argument(
        "--schema-base-path",
        type=str,
        default=str(repo_root),
        help="Base path for schema files on local filesystem (default: repo root)",
    )

    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging",
    )

    args = parser.parse_args()

    # Handle deprecated --domain flag
    parent_domain = args.parent_domain
    if args.domain is not None:
        print(
            "Warning: --domain is deprecated, use --parent-domain instead", file=sys.stderr)
        parent_domain = args.domain

    # Create importer and run
    importer = AsyncAPIImporter(
        asyncapi_dir=args.asyncapi_dir,
        eventcatalog_dir=args.eventcatalog_dir,
        parent_domain_name=parent_domain,
        verbose=args.verbose,
        schema_base_path=args.schema_base_path,
    )

    try:
        importer.import_all()
        print("\n✅ Import completed successfully!")
    except Exception as e:
        print(f"\n❌ Import failed: {e}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
