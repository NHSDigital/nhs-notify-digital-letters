#!/usr/bin/env python3
"""
Example usage of the AsyncAPI to EventCatalog importer.

This script demonstrates various ways to use the importer programmatically.
"""

from pathlib import Path
from import_asyncapi import AsyncAPIImporter


def example_basic_usage():
    """Example: Basic usage with default settings."""
    print("Example 1: Basic Usage")
    print("-" * 50)

    importer = AsyncAPIImporter(
        asyncapi_dir="../../asyncapigenerator/output",
        eventcatalog_dir="../../eventcatalog/digital-letters",
        verbose=True
    )

    # This would run the full import
    # importer.import_all()
    print("Importer initialized with default settings")
    print()


def example_custom_paths():
    """Example: Using custom paths."""
    print("Example 2: Custom Paths")
    print("-" * 50)

    # Define custom paths
    asyncapi_path = Path("/custom/path/to/asyncapi")
    eventcatalog_path = Path("/custom/path/to/eventcatalog")

    importer = AsyncAPIImporter(
        asyncapi_dir=asyncapi_path,
        eventcatalog_dir=eventcatalog_path,
        parent_domain_name="Custom Parent Domain",
        verbose=True
    )

    print(f"AsyncAPI directory: {asyncapi_path}")
    print(f"EventCatalog directory: {eventcatalog_path}")
    print(f"Parent domain name: Custom Parent Domain")
    print()


def example_single_file():
    """Example: Processing a single AsyncAPI file."""
    print("Example 3: Single File Processing")
    print("-" * 50)

    importer = AsyncAPIImporter(
        asyncapi_dir="../../asyncapigenerator/output",
        eventcatalog_dir="../../eventcatalog/digital-letters",
        verbose=False
    )

    # Process a specific file
    single_file = Path("../../asyncapigenerator/output/asyncapi-mesh-poller.yaml")

    if single_file.exists():
        print(f"Processing single file: {single_file.name}")
        # importer.process_asyncapi_file(single_file)
    else:
        print(f"File not found: {single_file}")
    print()


def example_check_created_resources():
    """Example: Tracking created resources."""
    print("Example 4: Tracking Created Resources")
    print("-" * 50)

    importer = AsyncAPIImporter(
        asyncapi_dir="../../asyncapigenerator/output",
        eventcatalog_dir="../../eventcatalog/digital-letters",
        verbose=False
    )

    # After import, you can check what was created
    # importer.import_all()

    print("After import, you can access:")
    print(f"  - Services created: {len(importer.created_services)}")
    print(f"  - Events created: {len(importer.created_events)}")
    print(f"  - Channels created: {len(importer.created_channels)}")
    print()

    # You can also iterate over created resources
    print("Sample of created services:")
    created_services_list = list(importer.created_services)
    for service in created_services_list[:min(5, len(created_services_list))]:
        print(f"  - {service}")
    print()


def example_custom_domain_logic():
    """Example: Customizing subdomain extraction logic."""
    print("Example 5: Custom Subdomain Logic")
    print("-" * 50)

    # To customize subdomain extraction, you would extend the class
    class CustomAsyncAPIImporter(AsyncAPIImporter):
        def extract_subdomain_from_service(self, service_name, asyncapi_data):
            """Custom subdomain extraction logic."""
            # Custom logic here
            if "payment" in service_name.lower():
                return "Payment Services"
            elif "notification" in service_name.lower():
                return "Notification Services"

            # Fall back to parent implementation
            return super().extract_subdomain_from_service(service_name, asyncapi_data)

    importer = CustomAsyncAPIImporter(
        asyncapi_dir="../../asyncapigenerator/output",
        eventcatalog_dir="../../eventcatalog/digital-letters",
        verbose=False
    )

    print("Custom importer with specialized domain logic created")
    print()


def main():
    """Run all examples."""
    print("=" * 70)
    print("AsyncAPI to EventCatalog Importer - Usage Examples")
    print("=" * 70)
    print()

    example_basic_usage()
    example_custom_paths()
    example_single_file()
    example_check_created_resources()
    example_custom_domain_logic()

    print("=" * 70)
    print("Examples completed!")
    print("=" * 70)
    print()
    print("To actually run the importer, uncomment the import_all() calls")
    print("or use: python import_asyncapi.py --verbose")


if __name__ == "__main__":
    main()
