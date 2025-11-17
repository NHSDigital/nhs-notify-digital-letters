# Subdomain Structure Migration

## Overview

The AsyncAPI to EventCatalog importer has been updated to organize imported domains as **subdomains** under a **parent domain**, rather than as separate top-level domains.

## What Changed

### Previous Structure

```text
/domains/{DomainName}/
  index.mdx
  services/
    {ServiceName}/
      index.mdx
      events/
        ...
```

### New Structure

```text
/domains/{ParentDomain}/
  index.mdx
  subdomains/
    {SubDomain}/
      index.mdx
      services/
        {ServiceName}/
          index.mdx
          events/
            ...
```

## Example

For Digital Letters project:

### Before

- `/domains/mesh-services/`
- `/domains/pdm-services/`
- `/domains/core-services/`

### After

- `/domains/digital-letters/subdomains/mesh-services/`
- `/domains/digital-letters/subdomains/pdm-services/`
- `/domains/digital-letters/subdomains/core-services/`

## Benefits

1. **Better Organization**: Subdomains are grouped under a logical parent domain
2. **Scalability**: Multiple related projects can have their own parent domains
3. **Clear Hierarchy**: The relationship between parent domain and subdomains is explicit
4. **EventCatalog Compatibility**: Follows the EventCatalog pattern for nested domains

## Usage

### Command Line

The `--domain` flag has been renamed to `--parent-domain`:

```bash
# Old way (still works with deprecation warning)
python import_asyncapi.py --domain "Digital Letters"

# New way
python import_asyncapi.py --parent-domain "Digital Letters"
```

### Makefile

Use the `PARENT_DOMAIN_NAME` variable:

```bash
make import PARENT_DOMAIN_NAME="My Parent Domain"
```

The old `DOMAIN_NAME` variable still works for backward compatibility.

### Programmatic Usage

```python
from import_asyncapi import AsyncAPIImporter

# Initialize with parent domain name
importer = AsyncAPIImporter(
    asyncapi_dir="path/to/asyncapi",
    eventcatalog_dir="path/to/eventcatalog",
    parent_domain_name="Digital Letters",  # Changed from domain_name
    verbose=True
)

importer.import_all()
```

## API Changes

### Updated Methods

- `__init__(parent_domain_name=...)` - Renamed parameter from `domain_name`
- `extract_subdomain_from_service(...)` - Renamed from `extract_domain_from_service()`
- `create_subdomain_structure(...)` - New method
- `create_parent_domain_structure()` - New method
- `update_subdomain_relationships()` - Renamed from `update_domain_relationships()`

### Deprecated Methods (Backward Compatibility)

- `create_domain_structure()` - Now calls `create_subdomain_structure()`
- `update_domain_relationships()` - Now calls `update_subdomain_relationships()`

### Internal Changes

- `self.parent_domain_name` - Renamed from `self.domain_name`
- `self.subdomain_services` - Renamed from `self.domain_services`
- `self.created_parent_domain` - New flag to track parent domain creation

## Migration Guide

### For Existing Imports

If you have existing EventCatalog content from the old structure:

1. **Back up your EventCatalog directory**
2. **Option A: Clean Import**
   - Delete the old domains directory
   - Run the importer with the new structure

3. **Option B: Manual Migration**
   - Create parent domain directory: `/domains/{ParentDomain}/`
   - Create subdomains directory: `/domains/{ParentDomain}/subdomains/`
   - Move existing domains into subdomains directory
   - Update references in front matter

### For New Imports

Just use the new `--parent-domain` flag:

```bash
python import_asyncapi.py --parent-domain "Your Parent Domain"
```

## Customization

### Custom Subdomain Logic

You can still customize how subdomains are extracted from services:

```python
class CustomImporter(AsyncAPIImporter):
    def extract_subdomain_from_service(self, service_name, asyncapi_data):
        """Custom logic to determine subdomain."""
        if "payment" in service_name.lower():
            return "Payment Subdomain"
        return super().extract_subdomain_from_service(service_name, asyncapi_data)
```

### Configuring Parent Domain Name

The parent domain name can come from:

1. Command-line argument: `--parent-domain "My Domain"`
2. Environment variable: `PARENT_DOMAIN_NAME="My Domain"`
3. Makefile variable: `PARENT_DOMAIN_NAME=My Domain`
4. Default value: `"Digital Letters"`

## Testing

Run the updated tests to verify the new structure:

```bash
make test
# or
python -m unittest test_import_asyncapi.py -v
```

All tests have been updated to verify the new subdomain structure.

## Notes

- The parent domain name should **not be hard coded** in the logic
- It's configurable via parameter/argument
- For Digital Letters, the default is "Digital Letters"
- Other projects can use their own parent domain name
- The subdomain extraction logic (from service metadata/name) remains flexible and customizable
