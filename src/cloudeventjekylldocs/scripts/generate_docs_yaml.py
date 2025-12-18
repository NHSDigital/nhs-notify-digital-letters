#!/usr/bin/env python3
"""
Schema YAML documentation generator.
Generates structured YAML documentation files from JSON Schema YAML files.
These YAML files can then be consumed by other tools (like Jekyll) or the Markdown generator.
"""
import yaml
import json
import os
import sys
from pathlib import Path
from datetime import datetime


def generate_schema_docs_yaml(src_dir, docs_dir):
    """Generate YAML documentation for all YAML schema files in src_dir."""
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

    doc_yaml_files = []
    for yaml_file in yaml_files:
        doc_file = generate_single_doc_yaml(yaml_file, src_path, docs_path)
        if doc_file:
            doc_yaml_files.append(doc_file)

    # Generate hierarchical index YAML files
    generate_hierarchical_indices_yaml(doc_yaml_files, yaml_files, src_path, docs_path)

    return doc_yaml_files


def generate_single_doc_yaml(yaml_file, src_path, docs_path):
    """Generate YAML documentation for a single schema file."""
    try:
        with open(yaml_file, 'r') as f:
            schema = yaml.safe_load(f)

        # Calculate relative path from src
        rel_path = yaml_file.relative_to(src_path)

        # Create corresponding docs path (keep as .yaml)
        doc_file = docs_path / rel_path.with_suffix('.doc.yaml')
        doc_file.parent.mkdir(parents=True, exist_ok=True)

        # Generate documentation data
        doc_data = extract_schema_documentation(schema, yaml_file, rel_path)

        with open(doc_file, 'w') as f:
            yaml.dump(doc_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

        print(f"Generated YAML documentation: {doc_file}")
        return doc_file

    except Exception as e:
        print(f"Error processing {yaml_file}: {e}")
        return None


def extract_schema_documentation(schema, yaml_file, rel_path):
    """Extract structured documentation data from a schema."""
    title = schema.get('title', rel_path.stem.replace('.schema', '').title())
    description = schema.get('description', 'No description available.')
    schema_id = schema.get('$id', 'N/A')
    schema_version = schema.get('$schema', 'N/A')

    doc_data = {
        'metadata': {
            'title': title,
            'description': description,
            'schema_id': schema_id,
            'schema_version': schema_version,
            'generated': datetime.now().isoformat(),
            'source_file': str(rel_path),
            'source_path': str(yaml_file)
        },
        'properties': extract_properties_documentation(schema.get('properties', {})),
        'required_fields': schema.get('required', []),
        'inheritance': extract_inheritance_info(schema.get('allOf', [])),
        'additional_properties': extract_additional_properties_info(schema.get('additionalProperties')),
        'type': schema.get('type'),
        'constraints': extract_constraints(schema),
        'examples': schema.get('examples', []),
        'raw_schema': schema
    }

    return doc_data


def extract_properties_documentation(properties):
    """Extract documentation for schema properties."""
    props_doc = {}

    for prop_name, prop_def in properties.items():
        props_doc[prop_name] = {
            'type': prop_def.get('type', 'unknown'),
            'description': prop_def.get('description', 'No description available.'),
            'format': prop_def.get('format'),
            'pattern': prop_def.get('pattern'),
            'enum': prop_def.get('enum'),
            'const': prop_def.get('const'),
            'minimum': prop_def.get('minimum'),
            'maximum': prop_def.get('maximum'),
            'min_length': prop_def.get('minLength'),
            'max_length': prop_def.get('maxLength'),
            'reference': prop_def.get('$ref'),
            'examples': prop_def.get('examples', []),
            'comment': prop_def.get('$comment'),
            'default': prop_def.get('default'),
            'items': prop_def.get('items'),
            'properties': extract_properties_documentation(prop_def.get('properties', {})) if prop_def.get('properties') else None
        }

        # Remove None values to keep the YAML clean
        props_doc[prop_name] = {k: v for k, v in props_doc[prop_name].items() if v is not None}

    return props_doc


def extract_inheritance_info(all_of):
    """Extract inheritance information from allOf."""
    inheritance = []
    for ref_schema in all_of:
        ref = ref_schema.get('$ref')
        if ref:
            inheritance.append({
                'reference': ref,
                'schema': ref_schema
            })
    return inheritance


def extract_additional_properties_info(additional_props):
    """Extract additional properties information."""
    if additional_props is None:
        return None
    elif additional_props is True:
        return {'allowed': True}
    elif additional_props is False:
        return {'allowed': False}
    else:
        return {'schema': additional_props}


def extract_constraints(schema):
    """Extract schema-level constraints."""
    constraints = {}

    constraint_fields = [
        'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum',
        'minLength', 'maxLength', 'pattern', 'minItems', 'maxItems',
        'uniqueItems', 'minProperties', 'maxProperties'
    ]

    for field in constraint_fields:
        if field in schema:
            constraints[field] = schema[field]

    return constraints if constraints else None


def generate_hierarchical_indices_yaml(doc_yaml_files, original_yaml_files, src_path, docs_path):
    """Generate hierarchical index YAML files for all directories containing schemas."""
    # Get all unique directories that contain schema files
    directories = set()
    schemas_by_dir = {}
    doc_files_by_dir = {}

    for i, yaml_file in enumerate(original_yaml_files):
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
            doc_files_by_dir[dir_key] = []

        schemas_by_dir[dir_key].append(rel_path)
        if i < len(doc_yaml_files) and doc_yaml_files[i]:
            doc_files_by_dir[dir_key].append(doc_yaml_files[i].relative_to(docs_path))

    # Generate index YAML file for each directory
    for directory in directories:
        generate_directory_index_yaml(directory, schemas_by_dir, doc_files_by_dir, src_path, docs_path, directories)


def generate_directory_index_yaml(directory, schemas_by_dir, doc_files_by_dir, src_path, docs_path, all_directories):
    """Generate an index YAML file for a specific directory."""
    # Determine the index file path
    if directory == Path('.'):
        index_file = docs_path / "index.yaml"
        dir_title = "Schema Documentation"
        dir_key = 'root'
    else:
        index_file = docs_path / directory / "index.yaml"
        dir_title = f"Schema Documentation - {directory.name}"
        dir_key = str(directory)

    # Ensure directory exists
    index_file.parent.mkdir(parents=True, exist_ok=True)

    # Get parent directory for navigation
    parent_dir = directory.parent if directory != Path('.') else None
    parent_info = None
    if parent_dir is not None:
        if parent_dir == Path('.'):
            parent_info = {
                'path': '../index.yaml',
                'directory': 'root',
                'title': 'Schema Documentation'
            }
        else:
            # Calculate relative path to parent index
            depth = len(directory.parts)
            parent_path = "../" * depth + str(parent_dir) + "/index.yaml"
            parent_info = {
                'path': parent_path,
                'directory': str(parent_dir),
                'title': f"Schema Documentation - {parent_dir.name}"
            }

    # Get schemas in this directory
    schemas_in_dir = schemas_by_dir.get(dir_key, [])
    doc_files_in_dir = doc_files_by_dir.get(dir_key, [])

    # Build schema entries
    schema_entries = []
    for i, schema_path in enumerate(sorted(schemas_in_dir)):
        doc_path = doc_files_in_dir[i] if i < len(doc_files_in_dir) else None
        schema_name = schema_path.stem.replace('.schema', '')

        entry = {
            'name': schema_name,
            'source_file': str(schema_path),
            'doc_file': str(doc_path) if doc_path else None
        }

        # Calculate relative path from current index to doc file
        if doc_path and directory != Path('.'):
            try:
                entry['relative_doc_path'] = str(doc_path.relative_to(directory))
            except ValueError:
                entry['relative_doc_path'] = str(doc_path)
        elif doc_path:
            entry['relative_doc_path'] = str(doc_path)

        schema_entries.append(entry)

    # Get subdirectories
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

    # Build subdirectory entries
    subdir_entries = []
    for subdir in sorted(subdirs):
        if directory == Path('.'):
            subdir_link = f"{subdir}/index.yaml"
        else:
            subdir_link = f"{subdir.name}/index.yaml"

        subdir_entries.append({
            'name': subdir.name,
            'path': subdir_link,
            'directory': str(subdir)
        })

    # Build the index data
    total_schemas_in_tree = len([s for s in schemas_by_dir.values() for s in s])

    index_data = {
        'metadata': {
            'title': dir_title,
            'description': f"Index of schema documentation in {directory if directory != Path('.') else 'root directory'}",
            'generated': datetime.now().isoformat(),
            'directory': str(directory),
            'type': 'index'
        },
        'navigation': {
            'parent': parent_info
        } if parent_info else {},
        'schemas': schema_entries,
        'subdirectories': subdir_entries,
        'statistics': {
            'schemas_in_directory': len(schemas_in_dir),
            'total_schemas_in_tree': total_schemas_in_tree,
            'subdirectories_count': len(subdir_entries)
        },
        'generation_info': {
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'source_directory': str(src_path)
        }
    }

    with open(index_file, 'w') as f:
        yaml.dump(index_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print(f"Generated index YAML: {index_file}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python generate_docs_yaml.py <src_dir> <docs_dir>")
        sys.exit(1)

    src_dir = sys.argv[1]
    docs_dir = sys.argv[2]

    if not os.path.exists(src_dir):
        print(f"Source directory does not exist: {src_dir}")
        sys.exit(1)

    generate_schema_docs_yaml(src_dir, docs_dir)
    print("YAML documentation generation complete!")
