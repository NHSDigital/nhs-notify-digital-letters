#!/usr/bin/env python3
"""
Markdown documentation generator from YAML documentation files.
Generates Markdown documentation from structured YAML documentation files.
"""
import yaml
import json
import os
import sys
from pathlib import Path
from datetime import datetime


def generate_markdown_docs(docs_yaml_dir, docs_md_dir):
    """Generate Markdown documentation from YAML documentation files."""
    yaml_path = Path(docs_yaml_dir)
    md_path = Path(docs_md_dir)

    # Create markdown docs directory if it doesn't exist
    md_path.mkdir(parents=True, exist_ok=True)

    # Find all YAML documentation files
    yaml_doc_files = list(yaml_path.rglob("*.doc.yaml"))

    if not yaml_doc_files:
        print(f"No YAML documentation files found in {docs_yaml_dir}")
        return

    print(f"Found {len(yaml_doc_files)} YAML documentation file(s) to convert")

    for yaml_doc_file in yaml_doc_files:
        generate_single_markdown_doc(yaml_doc_file, yaml_path, md_path)

    # Generate hierarchical markdown indices from YAML indices
    generate_hierarchical_markdown_indices(yaml_path, md_path)


def generate_single_markdown_doc(yaml_doc_file, yaml_path, md_path):
    """Generate Markdown documentation for a single YAML doc file."""
    try:
        with open(yaml_doc_file, 'r') as f:
            doc_data = yaml.safe_load(f)

        # Calculate relative path from yaml docs
        rel_path = yaml_doc_file.relative_to(yaml_path)

        # Create corresponding markdown path
        md_file = md_path / rel_path.with_suffix('.md')
        md_file.parent.mkdir(parents=True, exist_ok=True)

        # Generate markdown content
        content = generate_markdown_content(doc_data)

        with open(md_file, 'w') as f:
            f.write(content)

        print(f"Generated Markdown documentation: {md_file}")

    except Exception as e:
        print(f"Error processing {yaml_doc_file}: {e}")


def generate_markdown_content(doc_data):
    """Generate Markdown content from YAML documentation data."""
    metadata = doc_data.get('metadata', {})
    title = metadata.get('title', 'Untitled Schema')
    description = metadata.get('description', 'No description available.')
    schema_id = metadata.get('schema_id', 'N/A')
    schema_version = metadata.get('schema_version', 'N/A')
    source_file = metadata.get('source_file', 'N/A')
    generated = metadata.get('generated', 'N/A')

    # Front matter with all documentation properties
    content = f"""---
title: "{title}"
description: "{description}"
schema_id: "{schema_id}"
schema_version: "{schema_version}"
generated: "{generated}"
source_file: "{source_file}"
"""

    # Add structured documentation data to front matter
    properties = doc_data.get('properties', {})
    if properties:
        content += "properties:\n"
        properties_yaml = yaml.dump(properties, default_flow_style=False, sort_keys=False, allow_unicode=True)
        # Indent each line with 2 spaces
        indented_properties = '\n'.join('  ' + line if line.strip() else '' for line in properties_yaml.split('\n'))
        content += indented_properties + "\n"

    required_fields = doc_data.get('required_fields', [])
    if required_fields:
        content += "required_fields:\n"
        required_yaml = yaml.dump(required_fields, default_flow_style=False, allow_unicode=True)
        indented_required = '\n'.join('  ' + line if line.strip() else '' for line in required_yaml.split('\n'))
        content += indented_required + "\n"

    inheritance = doc_data.get('inheritance', [])
    if inheritance:
        content += "inheritance:\n"
        inheritance_yaml = yaml.dump(inheritance, default_flow_style=False, allow_unicode=True)
        indented_inheritance = '\n'.join('  ' + line if line.strip() else '' for line in inheritance_yaml.split('\n'))
        content += indented_inheritance + "\n"

    additional_properties = doc_data.get('additional_properties')
    if additional_properties is not None:
        content += "additional_properties:\n"
        additional_yaml = yaml.dump(additional_properties, default_flow_style=False, allow_unicode=True)
        indented_additional = '\n'.join('  ' + line if line.strip() else '' for line in additional_yaml.split('\n'))
        content += indented_additional + "\n"

    schema_type = doc_data.get('type')
    if schema_type:
        content += f"type: {schema_type}\n"

    constraints = doc_data.get('constraints')
    if constraints:
        content += "constraints:\n"
        constraints_yaml = yaml.dump(constraints, default_flow_style=False, allow_unicode=True)
        indented_constraints = '\n'.join('  ' + line if line.strip() else '' for line in constraints_yaml.split('\n'))
        content += indented_constraints + "\n"

    examples = doc_data.get('examples', [])
    if examples:
        content += "examples:\n"
        examples_yaml = yaml.dump(examples, default_flow_style=False, allow_unicode=True)
        indented_examples = '\n'.join('  ' + line if line.strip() else '' for line in examples_yaml.split('\n'))
        content += indented_examples + "\n"

    content += f"""---

# {title}

{description}

## Schema Information

- **Schema ID**: `{schema_id}`
- **Schema Version**: `{schema_version}`
- **Source File**: `{source_file}`

"""

    # Add properties documentation
    if properties:
        content += "## Properties\n\n"
        for prop_name, prop_data in properties.items():
            content += generate_property_markdown(prop_name, prop_data)
    else:
        content += "## Properties\n\nNo properties defined.\n\n"

    # Add required fields
    if required_fields:
        content += "## Required Fields\n\n"
        for field in required_fields:
            content += f"- `{field}`\n"
        content += "\n"

    # Add inheritance information
    if inheritance:
        content += "## Inheritance\n\n"
        content += "This schema extends the following schemas:\n\n"
        for inherit_info in inheritance:
            ref = inherit_info.get('reference', 'Unknown')
            content += f"- `{ref}`\n"
        content += "\n"

    # Add additional properties info
    if additional_properties is not None:
        content += "## Additional Properties\n\n"
        if additional_properties.get('allowed') is True:
            content += "Additional properties are **allowed**.\n\n"
        elif additional_properties.get('allowed') is False:
            content += "Additional properties are **not allowed**.\n\n"
        else:
            content += f"Additional properties: `{additional_properties}`\n\n"

    # Add type information
    if schema_type:
        content += f"## Type\n\n`{schema_type}`\n\n"

    # Add constraints
    if constraints:
        content += "## Constraints\n\n"
        for constraint, value in constraints.items():
            content += f"- **{constraint}**: `{value}`\n"
        content += "\n"

    # Add examples
    if examples:
        content += "## Examples\n\n"
        for i, example in enumerate(examples, 1):
            content += f"### Example {i}\n\n"
            content += "```json\n"
            content += json.dumps(example, indent=2)
            content += "\n```\n\n"

    # Add raw schema
    raw_schema = doc_data.get('raw_schema')
    if raw_schema:
        content += "## Raw Schema\n\n"
        content += "```yaml\n"
        content += yaml.dump(raw_schema, default_flow_style=False, sort_keys=False)
        content += "```\n"

    return content


def generate_property_markdown(prop_name, prop_data):
    """Generate Markdown documentation for a single property."""
    prop_type = prop_data.get('type', 'unknown')
    prop_desc = prop_data.get('description', 'No description available.')

    content = f"### `{prop_name}`\n\n"
    content += f"**Type**: `{prop_type}`\n\n"
    content += f"{prop_desc}\n\n"

    # Add additional property details
    details = []

    if prop_data.get('format'):
        details.append(f"**Format**: `{prop_data['format']}`")

    if prop_data.get('pattern'):
        details.append(f"**Pattern**: `{prop_data['pattern']}`")

    if prop_data.get('enum'):
        enum_values = ', '.join(f"`{v}`" for v in prop_data['enum'])
        details.append(f"**Allowed values**: {enum_values}")

    if prop_data.get('const') is not None:
        details.append(f"**Constant value**: `{prop_data['const']}`")

    if prop_data.get('minimum') is not None:
        details.append(f"**Minimum**: `{prop_data['minimum']}`")

    if prop_data.get('maximum') is not None:
        details.append(f"**Maximum**: `{prop_data['maximum']}`")

    if prop_data.get('min_length') is not None:
        details.append(f"**Minimum length**: `{prop_data['min_length']}`")

    if prop_data.get('max_length') is not None:
        details.append(f"**Maximum length**: `{prop_data['max_length']}`")

    if prop_data.get('reference'):
        details.append(f"**Reference**: `{prop_data['reference']}`")

    if prop_data.get('examples'):
        examples = ', '.join(f"`{ex}`" for ex in prop_data['examples'])
        details.append(f"**Examples**: {examples}")

    if prop_data.get('comment'):
        details.append(f"**Comment**: {prop_data['comment']}")

    if prop_data.get('default') is not None:
        details.append(f"**Default**: `{prop_data['default']}`")

    if details:
        content += "\n".join(details) + "\n\n"

    # Handle nested properties (for object types)
    nested_props = prop_data.get('properties')
    if nested_props:
        content += f"#### Properties of `{prop_name}`\n\n"
        for nested_prop_name, nested_prop_data in nested_props.items():
            content += generate_nested_property_markdown(nested_prop_name, nested_prop_data, level=5)

    return content


def generate_nested_property_markdown(prop_name, prop_data, level=4):
    """Generate Markdown documentation for nested properties."""
    prop_type = prop_data.get('type', 'unknown')
    prop_desc = prop_data.get('description', 'No description available.')

    header = "#" * level
    content = f"{header} `{prop_name}`\n\n"
    content += f"**Type**: `{prop_type}`\n\n"
    content += f"{prop_desc}\n\n"

    # Add basic property details (similar to main properties but more compact)
    details = []

    for field, label in [
        ('format', 'Format'),
        ('pattern', 'Pattern'),
        ('reference', 'Reference'),
        ('default', 'Default')
    ]:
        if prop_data.get(field) is not None:
            details.append(f"**{label}**: `{prop_data[field]}`")

    if prop_data.get('enum'):
        enum_values = ', '.join(f"`{v}`" for v in prop_data['enum'])
        details.append(f"**Allowed values**: {enum_values}")

    if details:
        content += " | ".join(details) + "\n\n"

    return content


def generate_hierarchical_markdown_indices(yaml_path, md_path):
    """Generate hierarchical Markdown index files from YAML index files."""
    # Find all YAML index files
    yaml_index_files = list(yaml_path.rglob("index.yaml"))

    for yaml_index_file in yaml_index_files:
        generate_markdown_index_from_yaml(yaml_index_file, yaml_path, md_path)


def generate_markdown_index_from_yaml(yaml_index_file, yaml_path, md_path):
    """Generate a Markdown index file from a YAML index file."""
    try:
        with open(yaml_index_file, 'r') as f:
            index_data = yaml.safe_load(f)

        # Calculate relative path
        rel_path = yaml_index_file.relative_to(yaml_path)
        md_index_file = md_path / rel_path.with_suffix('.md')
        md_index_file.parent.mkdir(parents=True, exist_ok=True)

        # Generate markdown content
        content = generate_index_markdown_content(index_data)

        with open(md_index_file, 'w') as f:
            f.write(content)

        print(f"Generated Markdown index: {md_index_file}")

    except Exception as e:
        print(f"Error processing index {yaml_index_file}: {e}")


def generate_index_markdown_content(index_data):
    """Generate Markdown content for an index from YAML index data."""
    metadata = index_data.get('metadata', {})
    title = metadata.get('title', 'Schema Documentation')
    description = metadata.get('description', 'Index of schema documentation')
    directory = metadata.get('directory', '.')
    generated = metadata.get('generated', 'N/A')

    # Front matter
    content = f"""---
title: "{title}"
description: "{description}"
generated: "{generated}"
directory: "{directory}"
---

# {title}

"""

    # Add parent navigation
    navigation = index_data.get('navigation', {})
    parent = navigation.get('parent')
    if parent:
        parent_path = parent.get('path', '../index.md').replace('.yaml', '.md')
        content += f"[↑ Parent Directory]({parent_path})\n\n"

    # Add schemas in this directory
    schemas = index_data.get('schemas', [])
    if schemas:
        content += "## Schemas in this directory\n\n"
        for schema in schemas:
            name = schema.get('name', 'Unknown')
            relative_doc_path = schema.get('relative_doc_path', schema.get('doc_file', ''))
            if relative_doc_path:
                # Convert .doc.yaml to .md
                md_path = relative_doc_path.replace('.doc.yaml', '.md')
                content += f"- [{name}]({md_path})\n"
            else:
                content += f"- {name} (no documentation)\n"
        content += "\n"

    # Add subdirectories
    subdirectories = index_data.get('subdirectories', [])
    if subdirectories:
        content += "## Subdirectories\n\n"
        for subdir in subdirectories:
            name = subdir.get('name', 'Unknown')
            path = subdir.get('path', '').replace('.yaml', '.md')
            content += f"- [{name}/]({path})\n"
        content += "\n"

    # Add generation info
    stats = index_data.get('statistics', {})
    gen_info = index_data.get('generation_info', {})

    content += f"""## Generation Info

- **Schemas in this directory**: {stats.get('schemas_in_directory', 0)}
- **Total schemas in tree**: {stats.get('total_schemas_in_tree', 0)}
- **Subdirectories**: {stats.get('subdirectories_count', 0)}
- **Generated**: {gen_info.get('generated_at', 'Unknown')}
- **Source directory**: `{gen_info.get('source_directory', 'Unknown')}`
"""

    return content


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python generate_docs_markdown.py <docs_yaml_dir> <docs_md_dir>")
        sys.exit(1)

    docs_yaml_dir = sys.argv[1]
    docs_md_dir = sys.argv[2]

    if not os.path.exists(docs_yaml_dir):
        print(f"YAML docs directory does not exist: {docs_yaml_dir}")
        sys.exit(1)

    generate_markdown_docs(docs_yaml_dir, docs_md_dir)
    print("Markdown documentation generation complete!")
