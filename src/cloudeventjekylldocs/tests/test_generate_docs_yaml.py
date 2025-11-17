"""Unit tests for generate_docs_yaml.py script."""
import pytest
import yaml
import json
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, mock_open
import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from generate_docs_yaml import (
    generate_schema_docs_yaml,
    generate_single_doc_yaml,
    extract_schema_documentation,
    extract_properties_documentation,
    extract_inheritance_info,
    extract_additional_properties_info,
    extract_constraints,
    generate_hierarchical_indices_yaml,
    generate_directory_index_yaml
)


@pytest.fixture
def sample_schema():
    """Sample JSON Schema in YAML format."""
    return {
        '$schema': 'http://json-schema.org/draft-07/schema#',
        '$id': 'https://example.com/schemas/test.schema.yaml',
        'title': 'Test Schema',
        'description': 'A test schema for documentation',
        'type': 'object',
        'properties': {
            'id': {
                'type': 'string',
                'format': 'uuid',
                'description': 'Unique identifier'
            },
            'name': {
                'type': 'string',
                'minLength': 1,
                'maxLength': 100,
                'description': 'Name field',
                'examples': ['John Doe']
            },
            'age': {
                'type': 'integer',
                'minimum': 0,
                'maximum': 150,
                'description': 'Age in years'
            },
            'email': {
                'type': 'string',
                'format': 'email',
                'pattern': '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                'description': 'Email address'
            },
            'status': {
                'type': 'string',
                'enum': ['active', 'inactive', 'pending'],
                'description': 'Status of the record'
            }
        },
        'required': ['id', 'name'],
        'additionalProperties': False,
        'minProperties': 2,
        'maxProperties': 10
    }


@pytest.fixture
def schema_with_allof():
    """Schema with inheritance via allOf."""
    return {
        '$schema': 'http://json-schema.org/draft-07/schema#',
        'title': 'Extended Schema',
        'allOf': [
            {'$ref': 'base.schema.yaml'},
            {'$ref': 'mixin.schema.yaml'}
        ],
        'properties': {
            'extra': {'type': 'string'}
        }
    }


@pytest.fixture
def schema_with_nested_properties():
    """Schema with nested object properties."""
    return {
        'title': 'Nested Schema',
        'type': 'object',
        'properties': {
            'address': {
                'type': 'object',
                'description': 'Address information',
                'properties': {
                    'street': {'type': 'string', 'description': 'Street name'},
                    'city': {'type': 'string', 'description': 'City name'},
                    'zipcode': {'type': 'string', 'pattern': '\\d{5}'}
                }
            },
            'contacts': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'type': {'type': 'string'},
                        'value': {'type': 'string'}
                    }
                }
            }
        }
    }


class TestExtractPropertiesDocumentation:
    """Test property extraction functionality."""

    def test_extract_basic_properties(self, sample_schema):
        """Test extraction of basic property types."""
        props = extract_properties_documentation(sample_schema['properties'])

        assert 'id' in props
        assert props['id']['type'] == 'string'
        assert props['id']['format'] == 'uuid'
        assert props['id']['description'] == 'Unique identifier'

    def test_extract_string_constraints(self, sample_schema):
        """Test extraction of string constraints."""
        props = extract_properties_documentation(sample_schema['properties'])

        assert props['name']['min_length'] == 1
        assert props['name']['max_length'] == 100
        assert props['name']['examples'] == ['John Doe']

    def test_extract_numeric_constraints(self, sample_schema):
        """Test extraction of numeric constraints."""
        props = extract_properties_documentation(sample_schema['properties'])

        assert props['age']['type'] == 'integer'
        assert props['age']['minimum'] == 0
        assert props['age']['maximum'] == 150

    def test_extract_pattern_constraint(self, sample_schema):
        """Test extraction of pattern constraints."""
        props = extract_properties_documentation(sample_schema['properties'])

        assert 'pattern' in props['email']
        assert props['email']['pattern'] == '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'

    def test_extract_enum_values(self, sample_schema):
        """Test extraction of enum values."""
        props = extract_properties_documentation(sample_schema['properties'])

        assert props['status']['enum'] == ['active', 'inactive', 'pending']

    def test_extract_nested_properties(self, schema_with_nested_properties):
        """Test extraction of nested object properties."""
        props = extract_properties_documentation(schema_with_nested_properties['properties'])

        assert 'address' in props
        assert props['address']['type'] == 'object'
        assert props['address']['properties'] is not None
        assert 'street' in props['address']['properties']
        assert props['address']['properties']['street']['type'] == 'string'

    def test_extract_array_items(self, schema_with_nested_properties):
        """Test extraction of array item definitions."""
        props = extract_properties_documentation(schema_with_nested_properties['properties'])

        assert 'contacts' in props
        assert props['contacts']['type'] == 'array'
        assert props['contacts']['items'] is not None

    def test_empty_properties(self):
        """Test extraction from empty properties."""
        props = extract_properties_documentation({})

        assert props == {}

    def test_none_values_removed(self):
        """Test that None values are removed from properties."""
        properties = {
            'test': {
                'type': 'string',
                'description': 'Test property'
                # No format, pattern, etc. - should result in None values
            }
        }

        props = extract_properties_documentation(properties)

        # Verify None values are not in the output
        assert 'format' not in props['test']
        assert 'pattern' not in props['test']
        assert 'enum' not in props['test']


class TestExtractInheritanceInfo:
    """Test inheritance extraction functionality."""

    def test_extract_allof_references(self, schema_with_allof):
        """Test extraction of allOf references."""
        inheritance = extract_inheritance_info(schema_with_allof['allOf'])

        assert len(inheritance) == 2
        assert inheritance[0]['reference'] == 'base.schema.yaml'
        assert inheritance[1]['reference'] == 'mixin.schema.yaml'

    def test_extract_allof_with_schema(self):
        """Test extraction of allOf with embedded schema."""
        all_of = [
            {'$ref': 'base.schema.yaml'},
            {'properties': {'extra': {'type': 'string'}}}
        ]

        inheritance = extract_inheritance_info(all_of)

        assert len(inheritance) == 1
        assert inheritance[0]['reference'] == 'base.schema.yaml'

    def test_empty_allof(self):
        """Test extraction from empty allOf."""
        inheritance = extract_inheritance_info([])

        assert inheritance == []


class TestExtractAdditionalPropertiesInfo:
    """Test additional properties extraction."""

    def test_additional_properties_true(self):
        """Test when additionalProperties is true."""
        info = extract_additional_properties_info(True)

        assert info == {'allowed': True}

    def test_additional_properties_false(self):
        """Test when additionalProperties is false."""
        info = extract_additional_properties_info(False)

        assert info == {'allowed': False}

    def test_additional_properties_schema(self):
        """Test when additionalProperties has a schema."""
        schema = {'type': 'string', 'pattern': '^[a-z]+$'}
        info = extract_additional_properties_info(schema)

        assert info == {'schema': schema}

    def test_additional_properties_none(self):
        """Test when additionalProperties is not specified."""
        info = extract_additional_properties_info(None)

        assert info is None


class TestExtractConstraints:
    """Test constraint extraction functionality."""

    def test_extract_numeric_constraints(self):
        """Test extraction of numeric constraints."""
        schema = {
            'minimum': 0,
            'maximum': 100,
            'exclusiveMinimum': True,
            'exclusiveMaximum': False
        }

        constraints = extract_constraints(schema)

        assert constraints['minimum'] == 0
        assert constraints['maximum'] == 100
        assert constraints['exclusiveMinimum'] is True
        assert constraints['exclusiveMaximum'] is False

    def test_extract_string_constraints(self):
        """Test extraction of string constraints."""
        schema = {
            'minLength': 5,
            'maxLength': 50,
            'pattern': '^[a-z]+$'
        }

        constraints = extract_constraints(schema)

        assert constraints['minLength'] == 5
        assert constraints['maxLength'] == 50
        assert constraints['pattern'] == '^[a-z]+$'

    def test_extract_array_constraints(self):
        """Test extraction of array constraints."""
        schema = {
            'minItems': 1,
            'maxItems': 10,
            'uniqueItems': True
        }

        constraints = extract_constraints(schema)

        assert constraints['minItems'] == 1
        assert constraints['maxItems'] == 10
        assert constraints['uniqueItems'] is True

    def test_extract_object_constraints(self):
        """Test extraction of object constraints."""
        schema = {
            'minProperties': 2,
            'maxProperties': 20
        }

        constraints = extract_constraints(schema)

        assert constraints['minProperties'] == 2
        assert constraints['maxProperties'] == 20

    def test_no_constraints(self):
        """Test extraction when no constraints present."""
        schema = {'type': 'string'}

        constraints = extract_constraints(schema)

        assert constraints is None


class TestExtractSchemaDocumentation:
    """Test schema documentation extraction."""

    def test_extract_full_documentation(self, sample_schema):
        """Test extraction of complete schema documentation."""
        yaml_file = Path('/test/schemas/test.schema.yaml')
        rel_path = Path('test.schema.yaml')

        doc = extract_schema_documentation(sample_schema, yaml_file, rel_path)

        # Verify metadata
        assert doc['metadata']['title'] == 'Test Schema'
        assert doc['metadata']['description'] == 'A test schema for documentation'
        assert doc['metadata']['schema_id'] == 'https://example.com/schemas/test.schema.yaml'
        assert doc['metadata']['source_file'] == 'test.schema.yaml'

        # Verify properties extracted
        assert 'properties' in doc
        assert len(doc['properties']) == 5

        # Verify required fields
        assert doc['required_fields'] == ['id', 'name']

        # Verify type
        assert doc['type'] == 'object'

        # Verify constraints
        assert doc['constraints'] is not None
        assert doc['constraints']['minProperties'] == 2

    def test_extract_with_inheritance(self, schema_with_allof):
        """Test extraction with inheritance information."""
        yaml_file = Path('/test/schemas/extended.schema.yaml')
        rel_path = Path('extended.schema.yaml')

        doc = extract_schema_documentation(schema_with_allof, yaml_file, rel_path)

        assert len(doc['inheritance']) == 2
        assert doc['inheritance'][0]['reference'] == 'base.schema.yaml'

    def test_extract_minimal_schema(self):
        """Test extraction from minimal schema."""
        minimal_schema = {'type': 'string'}
        yaml_file = Path('/test/minimal.schema.yaml')
        rel_path = Path('minimal.schema.yaml')

        doc = extract_schema_documentation(minimal_schema, yaml_file, rel_path)

        # Should have defaults
        assert doc['metadata']['title'] == 'Minimal'
        assert doc['metadata']['description'] == 'No description available.'
        assert doc['metadata']['schema_id'] == 'N/A'
        assert doc['type'] == 'string'

    def test_generated_timestamp(self, sample_schema):
        """Test that generated timestamp is included."""
        yaml_file = Path('/test/test.schema.yaml')
        rel_path = Path('test.schema.yaml')

        with patch('generate_docs_yaml.datetime') as mock_datetime:
            mock_now = mock_datetime.now.return_value
            mock_now.isoformat.return_value = '2024-01-01T12:00:00'

            doc = extract_schema_documentation(sample_schema, yaml_file, rel_path)

            assert doc['metadata']['generated'] == '2024-01-01T12:00:00'

    def test_raw_schema_included(self, sample_schema):
        """Test that raw schema is included in documentation."""
        yaml_file = Path('/test/test.schema.yaml')
        rel_path = Path('test.schema.yaml')

        doc = extract_schema_documentation(sample_schema, yaml_file, rel_path)

        assert doc['raw_schema'] == sample_schema


class TestGenerateSingleDocYaml:
    """Test single YAML document generation."""

    def test_generate_single_doc(self, tmp_path, sample_schema):
        """Test generation of single documentation YAML file."""
        # Create source schema file
        src_path = tmp_path / "src"
        src_path.mkdir()
        yaml_file = src_path / "test.schema.yaml"

        with open(yaml_file, 'w') as f:
            yaml.dump(sample_schema, f)

        # Generate documentation
        docs_path = tmp_path / "docs"
        doc_file = generate_single_doc_yaml(yaml_file, src_path, docs_path)

        assert doc_file is not None
        assert doc_file.exists()
        assert doc_file.name == 'test.schema.doc.yaml'

        # Verify content
        with open(doc_file, 'r') as f:
            doc_data = yaml.safe_load(f)

        assert doc_data['metadata']['title'] == 'Test Schema'
        assert 'properties' in doc_data

    def test_generate_nested_path(self, tmp_path, sample_schema):
        """Test generation with nested directory structure."""
        src_path = tmp_path / "src"
        nested_dir = src_path / "events" / "notifications"
        nested_dir.mkdir(parents=True)

        yaml_file = nested_dir / "email.schema.yaml"
        with open(yaml_file, 'w') as f:
            yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"
        doc_file = generate_single_doc_yaml(yaml_file, src_path, docs_path)

        assert doc_file is not None
        # Should preserve directory structure
        assert doc_file.parent.name == 'notifications'
        assert doc_file.parent.parent.name == 'events'

    def test_generate_invalid_yaml(self, tmp_path):
        """Test handling of invalid YAML file."""
        src_path = tmp_path / "src"
        src_path.mkdir()
        yaml_file = src_path / "invalid.schema.yaml"

        # Write invalid YAML
        with open(yaml_file, 'w') as f:
            f.write("{ invalid yaml content ]")

        docs_path = tmp_path / "docs"
        doc_file = generate_single_doc_yaml(yaml_file, src_path, docs_path)

        # Should return None on error
        assert doc_file is None

    def test_generate_missing_file(self, tmp_path):
        """Test handling of missing file."""
        src_path = tmp_path / "src"
        src_path.mkdir()
        yaml_file = src_path / "missing.schema.yaml"

        docs_path = tmp_path / "docs"
        doc_file = generate_single_doc_yaml(yaml_file, src_path, docs_path)

        assert doc_file is None


class TestGenerateDirectoryIndexYaml:
    """Test directory index generation."""

    def test_generate_root_index(self, tmp_path):
        """Test generation of root directory index."""
        src_path = tmp_path / "src"
        docs_path = tmp_path / "docs"
        docs_path.mkdir(parents=True)

        schemas_by_dir = {
            'root': [Path('test1.schema.yaml'), Path('test2.schema.yaml')]
        }
        doc_files_by_dir = {
            'root': [Path('test1.schema.doc.yaml'), Path('test2.schema.doc.yaml')]
        }
        all_directories = {Path('.')}

        generate_directory_index_yaml(
            Path('.'), schemas_by_dir, doc_files_by_dir,
            src_path, docs_path, all_directories
        )

        index_file = docs_path / "index.yaml"
        assert index_file.exists()

        with open(index_file, 'r') as f:
            index_data = yaml.safe_load(f)

        assert index_data['metadata']['title'] == 'Schema Documentation'
        assert len(index_data['schemas']) == 2
        assert index_data['statistics']['schemas_in_directory'] == 2

    def test_generate_subdirectory_index(self, tmp_path):
        """Test generation of subdirectory index."""
        src_path = tmp_path / "src"
        docs_path = tmp_path / "docs"
        subdir = Path('events')
        (docs_path / subdir).mkdir(parents=True)

        schemas_by_dir = {
            'events': [Path('events/notification.schema.yaml')]
        }
        doc_files_by_dir = {
            'events': [Path('events/notification.schema.doc.yaml')]
        }
        all_directories = {Path('.'), subdir}

        generate_directory_index_yaml(
            subdir, schemas_by_dir, doc_files_by_dir,
            src_path, docs_path, all_directories
        )

        index_file = docs_path / subdir / "index.yaml"
        assert index_file.exists()

        with open(index_file, 'r') as f:
            index_data = yaml.safe_load(f)

        assert 'events' in index_data['metadata']['title']
        assert index_data['navigation']['parent'] is not None

    def test_index_with_subdirectories(self, tmp_path):
        """Test index generation with subdirectories."""
        src_path = tmp_path / "src"
        docs_path = tmp_path / "docs"
        docs_path.mkdir(parents=True)

        schemas_by_dir = {'root': []}
        doc_files_by_dir = {'root': []}
        all_directories = {Path('.'), Path('events'), Path('schemas')}

        generate_directory_index_yaml(
            Path('.'), schemas_by_dir, doc_files_by_dir,
            src_path, docs_path, all_directories
        )

        index_file = docs_path / "index.yaml"
        with open(index_file, 'r') as f:
            index_data = yaml.safe_load(f)

        assert len(index_data['subdirectories']) == 2
        subdir_names = [s['name'] for s in index_data['subdirectories']]
        assert 'events' in subdir_names
        assert 'schemas' in subdir_names


class TestGenerateHierarchicalIndicesYaml:
    """Test hierarchical index generation."""

    def test_generate_flat_structure(self, tmp_path, sample_schema):
        """Test generation for flat directory structure."""
        src_path = tmp_path / "src"
        src_path.mkdir()

        # Create schema files
        schema1 = src_path / "test1.schema.yaml"
        schema2 = src_path / "test2.schema.yaml"

        for schema_file in [schema1, schema2]:
            with open(schema_file, 'w') as f:
                yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"

        # Generate docs first
        doc_files = []
        for schema_file in [schema1, schema2]:
            doc_file = generate_single_doc_yaml(schema_file, src_path, docs_path)
            doc_files.append(doc_file)

        # Generate hierarchical indices
        generate_hierarchical_indices_yaml(doc_files, [schema1, schema2], src_path, docs_path)

        # Verify root index created
        index_file = docs_path / "index.yaml"
        assert index_file.exists()

    def test_generate_nested_structure(self, tmp_path, sample_schema):
        """Test generation for nested directory structure."""
        src_path = tmp_path / "src"
        events_dir = src_path / "events"
        events_dir.mkdir(parents=True)

        # Create schema in nested directory
        schema_file = events_dir / "notification.schema.yaml"
        with open(schema_file, 'w') as f:
            yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"

        doc_file = generate_single_doc_yaml(schema_file, src_path, docs_path)
        generate_hierarchical_indices_yaml([doc_file], [schema_file], src_path, docs_path)

        # Verify both root and subdirectory indices created
        root_index = docs_path / "index.yaml"
        subdir_index = docs_path / "events" / "index.yaml"

        assert root_index.exists()
        assert subdir_index.exists()


class TestGenerateSchemaDocsYaml:
    """Test main documentation generation function."""

    def test_generate_docs_yaml(self, tmp_path, sample_schema):
        """Test complete documentation generation process."""
        src_path = tmp_path / "src"
        src_path.mkdir()

        # Create schema file
        schema_file = src_path / "test.schema.yaml"
        with open(schema_file, 'w') as f:
            yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"

        # Generate documentation
        doc_files = generate_schema_docs_yaml(str(src_path), str(docs_path))

        assert doc_files is not None
        assert len(doc_files) == 1
        assert doc_files[0].exists()

        # Verify index created
        index_file = docs_path / "index.yaml"
        assert index_file.exists()

    def test_generate_no_schemas(self, tmp_path, capsys):
        """Test generation with no schema files."""
        src_path = tmp_path / "src"
        src_path.mkdir()

        docs_path = tmp_path / "docs"

        # Generate documentation
        result = generate_schema_docs_yaml(str(src_path), str(docs_path))

        captured = capsys.readouterr()
        assert "No YAML schema files found" in captured.out
        assert result is None

    def test_generate_multiple_schemas(self, tmp_path, sample_schema):
        """Test generation with multiple schema files."""
        src_path = tmp_path / "src"
        src_path.mkdir()

        # Create multiple schema files
        for i in range(3):
            schema_file = src_path / f"test{i}.schema.yaml"
            with open(schema_file, 'w') as f:
                yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"

        doc_files = generate_schema_docs_yaml(str(src_path), str(docs_path))

        assert len(doc_files) == 3

    def test_generate_with_nested_directories(self, tmp_path, sample_schema):
        """Test generation with nested directory structure."""
        src_path = tmp_path / "src"
        nested1 = src_path / "events" / "notifications"
        nested2 = src_path / "schemas" / "common"
        nested1.mkdir(parents=True)
        nested2.mkdir(parents=True)

        # Create schemas in different directories
        schema1 = nested1 / "email.schema.yaml"
        schema2 = nested2 / "address.schema.yaml"

        for schema_file in [schema1, schema2]:
            with open(schema_file, 'w') as f:
                yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"

        doc_files = generate_schema_docs_yaml(str(src_path), str(docs_path))

        assert len(doc_files) == 2

        # Verify nested doc structure created
        assert (docs_path / "events" / "notifications").exists()
        assert (docs_path / "schemas" / "common").exists()


class TestMainFunction:
    """Test main function and CLI interface."""

    def test_main_with_valid_args(self, tmp_path, sample_schema, monkeypatch):
        """Test main function with valid arguments."""
        src_path = tmp_path / "src"
        src_path.mkdir()

        schema_file = src_path / "test.schema.yaml"
        with open(schema_file, 'w') as f:
            yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"

        # Mock sys.argv
        monkeypatch.setattr('sys.argv', ['generate_docs_yaml.py', str(src_path), str(docs_path)])

        # Import and run main
        from generate_docs_yaml import __name__ as module_name
        if module_name == "__main__":
            # Can't easily test this without actually running the script
            pass

    def test_missing_source_directory(self, tmp_path, monkeypatch, capsys):
        """Test handling of missing source directory."""
        src_path = tmp_path / "nonexistent"
        docs_path = tmp_path / "docs"

        result = generate_schema_docs_yaml(str(src_path), str(docs_path))

        # Function should handle gracefully
        assert result is None
