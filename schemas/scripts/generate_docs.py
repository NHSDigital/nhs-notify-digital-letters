#!/usr/bin/env python3
"""
Schema documentation generator.
Generates Markdown documentation from YAML schema files.
"""
import yaml
import json
import os
import sys
from pathlib import Path
from datetime import datetime


def generate_schema_docs(src_dir, docs_dir):
    """Generate documentation for all YAML schema files in src_dir."""
    src_path = Path(src_dir)
    docs_path = Path(docs_dir)

    # Create docs directory if it doesn't exist
    docs_path.mkdir(parents=True, exist_ok=True)

    # Find all YAML schema files
    yaml_files = list(src_path.rglob("*.schema.yaml"))

    if not yaml_files:
        print(f"No YAML schema files found in {src_dir}")
        return

    print(f"Found {len(yaml_files)} schema file(s) to document")

    for yaml_file in yaml_files:
        generate_single_doc(yaml_file, src_path, docs_path)

    # Generate hierarchical index files
    generate_hierarchical_indices(yaml_files, src_path, docs_path)


def generate_single_doc(yaml_file, src_path, docs_path):
    """Generate documentation for a single schema file."""
    try:
        with open(yaml_file, 'r') as f:
            schema = yaml.safe_load(f)

        # Calculate relative path from src
        rel_path = yaml_file.relative_to(src_path)

        # Create corresponding docs path
        doc_file = docs_path / rel_path.with_suffix('.md')
        doc_file.parent.mkdir(parents=True, exist_ok=True)

        # Generate documentation content
        content = generate_doc_content(schema, yaml_file, rel_path)

        with open(doc_file, 'w') as f:
            f.write(content)

        print(f"Generated documentation: {doc_file}")

    except Exception as e:
        print(f"Error processing {yaml_file}: {e}")


def generate_doc_content(schema, yaml_file, rel_path):
    """Generate the Markdown content for a schema."""
    title = schema.get('title', rel_path.stem.replace('.schema', '').title())
    description = schema.get('description', 'No description available.')
    schema_id = schema.get('$id', 'N/A')
    schema_version = schema.get('$schema', 'N/A')

    # Front matter
    content = f"""---
title: "{title}"
description: "{description}"
schema_id: "{schema_id}"
schema_version: "{schema_version}"
generated: "{datetime.now().isoformat()}"
source_file: "{rel_path}"
---

# {title}

{description}

## Schema Information

- **Schema ID**: `{schema_id}`
- **Schema Version**: `{schema_version}`
- **Source File**: `{rel_path}`

## Properties

"""

    # Add properties documentation
    properties = schema.get('properties', {})
    if properties:
        for prop_name, prop_def in properties.items():
            content += generate_property_doc(prop_name, prop_def)
    else:
        content += "No properties defined.\n\n"

    # Add required fields
    required = schema.get('required', [])
    if required:
        content += "## Required Fields\n\n"
        for field in required:
            content += f"- `{field}`\n"
        content += "\n"

    # Add allOf information
    all_of = schema.get('allOf', [])
    if all_of:
        content += "## Inheritance\n\n"
        content += "This schema extends the following schemas:\n\n"
        for ref_schema in all_of:
            ref = ref_schema.get('$ref', 'Unknown')
            content += f"- `{ref}`\n"
        content += "\n"

    # Add additional properties info
    additional_props = schema.get('additionalProperties')
    if additional_props is not None:
        content += "## Additional Properties\n\n"
        if additional_props is True:
            content += "Additional properties are **allowed**.\n\n"
        elif additional_props is False:
            content += "Additional properties are **not allowed**.\n\n"
        else:
            content += f"Additional properties: `{additional_props}`\n\n"

    # Add type information
    schema_type = schema.get('type')
    if schema_type:
        content += f"## Type\n\n`{schema_type}`\n\n"

    # Add raw schema
    content += "## Raw Schema\n\n"
    content += "```yaml\n"
    content += yaml.dump(schema, default_flow_style=False, sort_keys=False)
    content += "```\n"

    return content


def generate_property_doc(prop_name, prop_def):
    """Generate documentation for a single property."""
    prop_type = prop_def.get('type', 'unknown')
    prop_desc = prop_def.get('description', 'No description available.')

    content = f"### `{prop_name}`\n\n"
    content += f"**Type**: `{prop_type}`\n\n"
    content += f"{prop_desc}\n\n"

    # Add additional property details
    details = []

    if 'format' in prop_def:
        details.append(f"**Format**: `{prop_def['format']}`")

    if 'pattern' in prop_def:
        details.append(f"**Pattern**: `{prop_def['pattern']}`")

    if 'enum' in prop_def:
        enum_values = ', '.join(f"`{v}`" for v in prop_def['enum'])
        details.append(f"**Allowed values**: {enum_values}")

    if 'const' in prop_def:
        details.append(f"**Constant value**: `{prop_def['const']}`")

    if 'minimum' in prop_def:
        details.append(f"**Minimum**: `{prop_def['minimum']}`")

    if 'maximum' in prop_def:
        details.append(f"**Maximum**: `{prop_def['maximum']}`")

    if 'minLength' in prop_def:
        details.append(f"**Minimum length**: `{prop_def['minLength']}`")

    if 'maxLength' in prop_def:
        details.append(f"**Maximum length**: `{prop_def['maxLength']}`")

    if '$ref' in prop_def:
        details.append(f"**Reference**: `{prop_def['$ref']}`")

    if 'examples' in prop_def:
        examples = ', '.join(f"`{ex}`" for ex in prop_def['examples'])
        details.append(f"**Examples**: {examples}")

    if '$comment' in prop_def:
        details.append(f"**Comment**: {prop_def['$comment']}")

    if details:
        content += "\n".join(details) + "\n\n"

    return content


def generate_hierarchical_indices(yaml_files, src_path, docs_path):
    """Generate hierarchical index files for all directories containing schemas."""
    # Get all unique directories that contain schema files
    directories = set()
    schemas_by_dir = {}

    for yaml_file in yaml_files:
        rel_path = yaml_file.relative_to(src_path)
        dir_path = rel_path.parent

        # Add this directory and all parent directories
        current_dir = dir_path
        while True:
            directories.add(current_dir)
            if current_dir == Path('.'):
                break
            current_dir = current_dir.parent

        # Group schemas by their immediate directory
        dir_key = str(dir_path) if dir_path != Path('.') else 'root'
        if dir_key not in schemas_by_dir:
            schemas_by_dir[dir_key] = []
        schemas_by_dir[dir_key].append(rel_path)

    # Generate index file for each directory
    for directory in directories:
        generate_directory_index(directory, schemas_by_dir, src_path, docs_path, directories)


def generate_directory_index(directory, schemas_by_dir, src_path, docs_path, all_directories):
    """Generate an index file for a specific directory."""
    # Determine the index file path
    if directory == Path('.'):
        index_file = docs_path / "index.md"
        dir_title = "Schema Documentation"
        dir_key = 'root'
    else:
        index_file = docs_path / directory / "index.md"
        dir_title = f"Schema Documentation - {directory.name}"
        dir_key = str(directory)

    # Ensure directory exists
    index_file.parent.mkdir(parents=True, exist_ok=True)

    # Get parent directory for navigation
    parent_dir = directory.parent if directory != Path('.') else None
    parent_link = ""
    if parent_dir is not None:
        if parent_dir == Path('.'):
            parent_link = "[↑ Parent Directory](../index.md)"
        else:
            # Calculate relative path to parent index
            depth = len(directory.parts)
            parent_path = "../" * depth + str(parent_dir) + "/index.md"
            parent_link = f"[↑ Parent Directory]({parent_path})"

    # Start building content
    content = f"""---
title: "{dir_title}"
description: "Index of schema documentation in {directory if directory != Path('.') else 'root directory'}"
generated: "{datetime.now().isoformat()}"
directory: "{directory}"
---

# {dir_title}

"""

    # Add parent navigation
    if parent_link:
        content += f"{parent_link}\n\n"

    # Add schemas in this directory
    schemas_in_dir = schemas_by_dir.get(dir_key, [])
    if schemas_in_dir:
        content += "## Schemas in this directory\n\n"
        for schema_path in sorted(schemas_in_dir):
            doc_path = schema_path.with_suffix('.md')
            schema_name = schema_path.stem.replace('.schema', '')

            # Calculate relative path from current index to schema
            if directory == Path('.'):
                rel_doc_path = str(doc_path)
            else:
                rel_doc_path = str(doc_path.relative_to(directory))

            content += f"- [{schema_name}]({rel_doc_path})\n"
        content += "\n"

    # Add subdirectories
    subdirs = []
    for other_dir in all_directories:
        if other_dir != directory and other_dir != Path('.'):
            # Check if other_dir is a child of current directory
            try:
                if directory == Path('.'):
                    # Root directory - check for immediate children
                    if len(other_dir.parts) == 1:
                        subdirs.append(other_dir)
                else:
                    # Non-root directory - check if it's an immediate child
                    if other_dir.parent == directory:
                        subdirs.append(other_dir)
            except ValueError:
                # Not a relative path
                continue

    if subdirs:
        content += "## Subdirectories\n\n"
        for subdir in sorted(subdirs):
            if directory == Path('.'):
                subdir_link = f"{subdir}/index.md"
            else:
                subdir_link = f"{subdir.name}/index.md"
            content += f"- [{subdir.name}/]({subdir_link})\n"
        content += "\n"

    # Add generation info
    total_schemas_in_tree = len([s for s in schemas_by_dir.values() for s in s])
    content += f"""## Generation Info

- **Schemas in this directory**: {len(schemas_in_dir)}
- **Total schemas in tree**: {total_schemas_in_tree}
- **Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **Source directory**: `{src_path}`
"""

    with open(index_file, 'w') as f:
        f.write(content)

    print(f"Generated index: {index_file}")


def generate_index(yaml_files, src_path, docs_path):
    """Generate an index file listing all schemas."""
    index_file = docs_path / "index.md"

    content = f"""---
title: "Schema Documentation Index"
description: "Index of all available schema documentation"
generated: "{datetime.now().isoformat()}"
---

# Schema Documentation

This directory contains documentation for all schema files.

## Available Schemas

"""

    # Group schemas by directory
    schemas_by_dir = {}
    for yaml_file in yaml_files:
        rel_path = yaml_file.relative_to(src_path)
        dir_name = str(rel_path.parent) if rel_path.parent != Path('.') else 'root'

        if dir_name not in schemas_by_dir:
            schemas_by_dir[dir_name] = []

        schemas_by_dir[dir_name].append(rel_path)

    for dir_name, schemas in sorted(schemas_by_dir.items()):
        content += f"### {dir_name}\n\n"
        for schema_path in sorted(schemas):
            doc_path = schema_path.with_suffix('.md')
            schema_name = schema_path.stem.replace('.schema', '')
            content += f"- [{schema_name}](./{doc_path})\n"
        content += "\n"

    content += f"""
## Generation Info

- **Total schemas**: {len(yaml_files)}
- **Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **Source directory**: `src/`
"""

    with open(index_file, 'w') as f:
        f.write(content)

    print(f"Generated index: {index_file}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python generate_docs.py <src_dir> <docs_dir>")
        sys.exit(1)

    src_dir = sys.argv[1]
    docs_dir = sys.argv[2]

    if not os.path.exists(src_dir):
        print(f"Source directory does not exist: {src_dir}")
        sys.exit(1)

    generate_schema_docs(src_dir, docs_dir)
    print("Documentation generation complete!")
