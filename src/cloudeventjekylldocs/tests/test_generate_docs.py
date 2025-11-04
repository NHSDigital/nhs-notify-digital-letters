"""Unit tests for generate_docs.py script."""
import pytest
import yaml
from pathlib import Path
from datetime import datetime
from unittest.mock import patch
import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from generate_docs import (
    generate_schema_docs,
    generate_single_doc,
    generate_doc_content,
    generate_property_doc,
    generate_hierarchical_indices,
    generate_directory_index,
    generate_index
)


@pytest.fixture
def sample_schema():
    """Sample JSON Schema for testing."""
    return {
        '$schema': 'http://json-schema.org/draft-07/schema#',
        '$id': 'https://example.com/schemas/test.schema.yaml',
        'title': 'Test Schema',
        'description': 'A test schema for documentation generation',
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
            'email': {
                'type': 'string',
                'format': 'email',
                'pattern': '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                'description': 'Email address'
            },
            'status': {
                'type': 'string',
                'enum': ['active', 'inactive', 'pending'],
                'description': 'Status field'
            },
            'config': {
                'type': 'object',
                '$ref': 'config.schema.yaml',
                'description': 'Configuration reference'
            }
        },
        'required': ['id', 'name'],
        'additionalProperties': False
    }


@pytest.fixture
def schema_with_allof():
    """Schema with inheritance via allOf."""
    return {
        'title': 'Extended Schema',
        'description': 'Schema with inheritance',
        'allOf': [
            {'$ref': 'base.schema.yaml'},
            {'$ref': 'mixin.schema.yaml'}
        ],
        'properties': {
            'extra': {'type': 'string', 'description': 'Extra field'}
        }
    }


@pytest.fixture
def minimal_schema():
    """Minimal schema with just required fields."""
    return {
        'type': 'string',
        'description': 'Simple string schema'
    }


class TestGeneratePropertyDoc:
    """Test property documentation generation."""

    def test_generate_basic_property(self):
        """Test generation of basic property documentation."""
        prop_def = {
            'type': 'string',
            'description': 'Test property'
        }

        result = generate_property_doc('test_field', prop_def)

        assert '### `test_field`' in result
        assert '**Type**: `string`' in result
        assert 'Test property' in result

    def test_generate_property_with_format(self):
        """Test property with format specification."""
        prop_def = {
            'type': 'string',
            'format': 'email',
            'description': 'Email field'
        }

        result = generate_property_doc('email', prop_def)

        assert '**Format**: `email`' in result

    def test_generate_property_with_pattern(self):
        """Test property with regex pattern."""
        prop_def = {
            'type': 'string',
            'pattern': '^[A-Z]+$',
            'description': 'Uppercase only'
        }

        result = generate_property_doc('code', prop_def)

        assert '**Pattern**: `^[A-Z]+$`' in result

    def test_generate_property_with_enum(self):
        """Test property with enum values."""
        prop_def = {
            'type': 'string',
            'enum': ['opt1', 'opt2', 'opt3'],
            'description': 'Options field'
        }

        result = generate_property_doc('options', prop_def)

        assert '**Allowed values**:' in result
        assert '`opt1`' in result
        assert '`opt2`' in result

    def test_generate_property_with_const(self):
        """Test property with constant value."""
        prop_def = {
            'type': 'string',
            'const': 'fixed',
            'description': 'Constant field'
        }

        result = generate_property_doc('constant', prop_def)

        assert '**Constant value**: `fixed`' in result

    def test_generate_property_with_numeric_constraints(self):
        """Test property with numeric constraints."""
        prop_def = {
            'type': 'integer',
            'minimum': 0,
            'maximum': 100,
            'description': 'Percentage'
        }

        result = generate_property_doc('percent', prop_def)

        assert '**Minimum**: `0`' in result
        assert '**Maximum**: `100`' in result

    def test_generate_property_with_string_length(self):
        """Test property with string length constraints."""
        prop_def = {
            'type': 'string',
            'minLength': 5,
            'maxLength': 50,
            'description': 'Length constrained string'
        }

        result = generate_property_doc('text', prop_def)

        assert '**Minimum length**: `5`' in result
        assert '**Maximum length**: `50`' in result

    def test_generate_property_with_reference(self):
        """Test property with $ref."""
        prop_def = {
            'type': 'object',
            '$ref': 'other.schema.yaml',
            'description': 'Referenced schema'
        }

        result = generate_property_doc('ref_field', prop_def)

        assert '**Reference**: `other.schema.yaml`' in result

    def test_generate_property_with_examples(self):
        """Test property with examples."""
        prop_def = {
            'type': 'string',
            'description': 'Test field',
            'examples': ['example1', 'example2']
        }

        result = generate_property_doc('test', prop_def)

        assert '**Examples**:' in result
        assert '`example1`' in result

    def test_generate_property_with_comment(self):
        """Test property with $comment."""
        prop_def = {
            'type': 'string',
            'description': 'Test field',
            '$comment': 'This is a special field'
        }

        result = generate_property_doc('test', prop_def)

        assert '**Comment**: This is a special field' in result

    def test_generate_property_no_description(self):
        """Test property without description."""
        prop_def = {
            'type': 'string'
        }

        result = generate_property_doc('test', prop_def)

        assert 'No description available' in result

    def test_generate_property_unknown_type(self):
        """Test property with no type specified."""
        prop_def = {
            'description': 'No type field'
        }

        result = generate_property_doc('test', prop_def)

        assert '**Type**: `unknown`' in result


class TestGenerateDocContent:
    """Test document content generation."""

    def test_generate_basic_content(self, sample_schema):
        """Test generation of basic document content."""
        yaml_file = Path('/test/schemas/test.schema.yaml')
        rel_path = Path('test.schema.yaml')

        result = generate_doc_content(sample_schema, yaml_file, rel_path)

        # Check front matter
        assert '---' in result
        assert 'title: "Test Schema"' in result
        assert 'description: "A test schema for documentation generation"' in result
        assert 'schema_id: "https://example.com/schemas/test.schema.yaml"' in result

        # Check main content
        assert '# Test Schema' in result
        assert '## Schema Information' in result
        assert '## Properties' in result

    def test_generate_content_with_properties(self, sample_schema):
        """Test content generation with properties."""
        yaml_file = Path('/test/test.schema.yaml')
        rel_path = Path('test.schema.yaml')

        result = generate_doc_content(sample_schema, yaml_file, rel_path)

        # Check properties are documented
        assert '### `id`' in result
        assert '### `name`' in result
        assert '### `email`' in result
        assert '### `status`' in result

    def test_generate_content_with_required_fields(self, sample_schema):
        """Test content with required fields section."""
        yaml_file = Path('/test/test.schema.yaml')
        rel_path = Path('test.schema.yaml')

        result = generate_doc_content(sample_schema, yaml_file, rel_path)

        assert '## Required Fields' in result
        assert '- `id`' in result
        assert '- `name`' in result

    def test_generate_content_with_allof(self, schema_with_allof):
        """Test content with inheritance information."""
        yaml_file = Path('/test/test.schema.yaml')
        rel_path = Path('test.schema.yaml')

        result = generate_doc_content(schema_with_allof, yaml_file, rel_path)

        assert '## Inheritance' in result
        assert '`base.schema.yaml`' in result
        assert '`mixin.schema.yaml`' in result

    def test_generate_content_with_additional_properties_false(self, sample_schema):
        """Test content with additionalProperties: false."""
        yaml_file = Path('/test/test.schema.yaml')
        rel_path = Path('test.schema.yaml')

        result = generate_doc_content(sample_schema, yaml_file, rel_path)

        assert '## Additional Properties' in result
        assert 'not allowed' in result

    def test_generate_content_with_additional_properties_true(self):
        """Test content with additionalProperties: true."""
        schema = {
            'title': 'Test',
            'description': 'Test schema',
            'additionalProperties': True
        }
        yaml_file = Path('/test/test.schema.yaml')
        rel_path = Path('test.schema.yaml')

        result = generate_doc_content(schema, yaml_file, rel_path)

        assert '## Additional Properties' in result
        assert 'allowed' in result

    def test_generate_content_with_type(self, sample_schema):
        """Test content with type information."""
        yaml_file = Path('/test/test.schema.yaml')
        rel_path = Path('test.schema.yaml')

        result = generate_doc_content(sample_schema, yaml_file, rel_path)

        assert '## Type' in result
        assert '`object`' in result

    def test_generate_content_with_raw_schema(self, sample_schema):
        """Test content includes raw schema."""
        yaml_file = Path('/test/test.schema.yaml')
        rel_path = Path('test.schema.yaml')

        result = generate_doc_content(sample_schema, yaml_file, rel_path)

        assert '## Raw Schema' in result
        assert '```yaml' in result

    def test_generate_content_minimal_schema(self, minimal_schema):
        """Test content generation from minimal schema."""
        yaml_file = Path('/test/minimal.schema.yaml')
        rel_path = Path('minimal.schema.yaml')

        result = generate_doc_content(minimal_schema, yaml_file, rel_path)

        assert 'Minimal' in result  # Title derived from filename
        assert 'No properties defined' in result

    def test_generate_content_no_title(self):
        """Test content generation when title is missing."""
        schema = {
            'description': 'Test schema',
            'type': 'object'
        }
        yaml_file = Path('/test/my-schema.schema.yaml')
        rel_path = Path('my-schema.schema.yaml')

        result = generate_doc_content(schema, yaml_file, rel_path)

        # Title should be derived from filename
        assert 'My-Schema' in result

    def test_generate_content_timestamp(self, sample_schema):
        """Test that timestamp is included in generated content."""
        yaml_file = Path('/test/test.schema.yaml')
        rel_path = Path('test.schema.yaml')

        with patch('generate_docs.datetime') as mock_datetime:
            mock_now = mock_datetime.now.return_value
            mock_now.isoformat.return_value = '2024-01-01T12:00:00'

            result = generate_doc_content(sample_schema, yaml_file, rel_path)

            assert 'generated: "2024-01-01T12:00:00"' in result


class TestGenerateSingleDoc:
    """Test single document generation."""

    def test_generate_single_doc(self, tmp_path, sample_schema):
        """Test generation of single documentation file."""
        # Create source schema file
        src_path = tmp_path / "src"
        src_path.mkdir()
        yaml_file = src_path / "test.schema.yaml"

        with open(yaml_file, 'w') as f:
            yaml.dump(sample_schema, f)

        # Generate documentation
        docs_path = tmp_path / "docs"
        generate_single_doc(yaml_file, src_path, docs_path)

        # Verify doc file created
        doc_file = docs_path / "test.schema.md"
        assert doc_file.exists()

        # Verify content
        with open(doc_file, 'r') as f:
            content = f.read()

        assert 'title: "Test Schema"' in content
        assert '## Properties' in content

    def test_generate_nested_doc(self, tmp_path, sample_schema):
        """Test generation with nested directory structure."""
        src_path = tmp_path / "src"
        nested_dir = src_path / "events" / "notifications"
        nested_dir.mkdir(parents=True)

        yaml_file = nested_dir / "email.schema.yaml"
        with open(yaml_file, 'w') as f:
            yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"
        generate_single_doc(yaml_file, src_path, docs_path)

        # Verify nested structure preserved
        doc_file = docs_path / "events" / "notifications" / "email.schema.md"
        assert doc_file.exists()

    def test_generate_invalid_yaml(self, tmp_path):
        """Test handling of invalid YAML file."""
        src_path = tmp_path / "src"
        src_path.mkdir()
        yaml_file = src_path / "invalid.schema.yaml"

        # Write invalid YAML
        with open(yaml_file, 'w') as f:
            f.write("{ invalid yaml ]")

        docs_path = tmp_path / "docs"

        # Should not raise exception
        generate_single_doc(yaml_file, src_path, docs_path)

    def test_generate_missing_file(self, tmp_path):
        """Test handling of missing file."""
        src_path = tmp_path / "src"
        src_path.mkdir()
        yaml_file = src_path / "missing.schema.yaml"

        docs_path = tmp_path / "docs"

        # Should not raise exception
        generate_single_doc(yaml_file, src_path, docs_path)


class TestGenerateDirectoryIndex:
    """Test directory index generation."""

    def test_generate_root_index(self, tmp_path):
        """Test generation of root directory index."""
        src_path = tmp_path / "src"
        docs_path = tmp_path / "docs"
        docs_path.mkdir(parents=True)

        schemas_by_dir = {
            'root': [Path('test1.schema.yaml'), Path('test2.schema.yaml')]
        }
        all_directories = {Path('.')}

        generate_directory_index(Path('.'), schemas_by_dir, src_path, docs_path, all_directories)

        index_file = docs_path / "index.md"
        assert index_file.exists()

        with open(index_file, 'r') as f:
            content = f.read()

        assert 'title: "Schema Documentation"' in content
        assert '## Schemas in this directory' in content
        assert '[test1]' in content
        assert '[test2]' in content

    def test_generate_subdirectory_index(self, tmp_path):
        """Test generation of subdirectory index."""
        src_path = tmp_path / "src"
        docs_path = tmp_path / "docs"
        subdir = Path('events')
        (docs_path / subdir).mkdir(parents=True)

        schemas_by_dir = {
            'events': [Path('events/notification.schema.yaml')]
        }
        all_directories = {Path('.'), subdir}

        generate_directory_index(subdir, schemas_by_dir, src_path, docs_path, all_directories)

        index_file = docs_path / subdir / "index.md"
        assert index_file.exists()

        with open(index_file, 'r') as f:
            content = f.read()

        assert 'Schema Documentation - events' in content
        assert '[↑ Parent Directory]' in content

    def test_generate_index_with_subdirectories(self, tmp_path):
        """Test index generation with subdirectories listed."""
        src_path = tmp_path / "src"
        docs_path = tmp_path / "docs"
        docs_path.mkdir(parents=True)

        schemas_by_dir = {'root': []}
        all_directories = {Path('.'), Path('events'), Path('schemas')}

        generate_directory_index(Path('.'), schemas_by_dir, src_path, docs_path, all_directories)

        index_file = docs_path / "index.md"
        with open(index_file, 'r') as f:
            content = f.read()

        assert '## Subdirectories' in content
        assert '[events/]' in content
        assert '[schemas/]' in content

    def test_generate_index_with_statistics(self, tmp_path):
        """Test index includes generation statistics."""
        src_path = tmp_path / "src"
        docs_path = tmp_path / "docs"
        docs_path.mkdir(parents=True)

        schemas_by_dir = {
            'root': [Path('test1.schema.yaml'), Path('test2.schema.yaml')]
        }
        all_directories = {Path('.')}

        generate_directory_index(Path('.'), schemas_by_dir, src_path, docs_path, all_directories)

        index_file = docs_path / "index.md"
        with open(index_file, 'r') as f:
            content = f.read()

        assert '## Generation Info' in content
        assert '**Schemas in this directory**: 2' in content


class TestGenerateHierarchicalIndices:
    """Test hierarchical indices generation."""

    def test_generate_flat_hierarchy(self, tmp_path, sample_schema):
        """Test generation of flat hierarchy."""
        src_path = tmp_path / "src"
        src_path.mkdir()

        # Create schema files
        schema1 = src_path / "test1.schema.yaml"
        schema2 = src_path / "test2.schema.yaml"

        for schema_file in [schema1, schema2]:
            with open(schema_file, 'w') as f:
                yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"
        docs_path.mkdir()

        generate_hierarchical_indices([schema1, schema2], src_path, docs_path)

        # Verify root index created
        index_file = docs_path / "index.md"
        assert index_file.exists()

    def test_generate_nested_hierarchy(self, tmp_path, sample_schema):
        """Test generation of nested hierarchy."""
        src_path = tmp_path / "src"
        events_dir = src_path / "events"
        events_dir.mkdir(parents=True)

        schema_file = events_dir / "notification.schema.yaml"
        with open(schema_file, 'w') as f:
            yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"
        docs_path.mkdir()

        generate_hierarchical_indices([schema_file], src_path, docs_path)

        # Verify both root and subdirectory indices created
        root_index = docs_path / "index.md"
        subdir_index = docs_path / "events" / "index.md"

        assert root_index.exists()
        assert subdir_index.exists()

    def test_generate_deep_hierarchy(self, tmp_path, sample_schema):
        """Test generation of deeply nested hierarchy."""
        src_path = tmp_path / "src"
        deep_dir = src_path / "level1" / "level2" / "level3"
        deep_dir.mkdir(parents=True)

        schema_file = deep_dir / "deep.schema.yaml"
        with open(schema_file, 'w') as f:
            yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"
        docs_path.mkdir()

        generate_hierarchical_indices([schema_file], src_path, docs_path)

        # Verify all levels have indices
        assert (docs_path / "index.md").exists()
        assert (docs_path / "level1" / "index.md").exists()
        assert (docs_path / "level1" / "level2" / "index.md").exists()
        assert (docs_path / "level1" / "level2" / "level3" / "index.md").exists()


class TestGenerateIndex:
    """Test simple index generation."""

    def test_generate_simple_index(self, tmp_path, sample_schema):
        """Test generation of simple flat index."""
        src_path = tmp_path / "src"
        src_path.mkdir()

        # Create schema files
        schema1 = src_path / "test1.schema.yaml"
        schema2 = src_path / "test2.schema.yaml"

        for schema_file in [schema1, schema2]:
            with open(schema_file, 'w') as f:
                yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"
        docs_path.mkdir()

        generate_index([schema1, schema2], src_path, docs_path)

        index_file = docs_path / "index.md"
        assert index_file.exists()

        with open(index_file, 'r') as f:
            content = f.read()

        assert 'Schema Documentation Index' in content
        assert '[test1]' in content
        assert '[test2]' in content

    def test_generate_index_grouped_by_directory(self, tmp_path, sample_schema):
        """Test index with schemas grouped by directory."""
        src_path = tmp_path / "src"
        events_dir = src_path / "events"
        events_dir.mkdir(parents=True)

        schema1 = src_path / "root.schema.yaml"
        schema2 = events_dir / "event.schema.yaml"

        for schema_file in [schema1, schema2]:
            with open(schema_file, 'w') as f:
                yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"
        docs_path.mkdir()

        generate_index([schema1, schema2], src_path, docs_path)

        index_file = docs_path / "index.md"
        with open(index_file, 'r') as f:
            content = f.read()

        assert '### root' in content
        assert '### events' in content


class TestGenerateSchemaDocs:
    """Test main schema documentation generation."""

    def test_generate_docs(self, tmp_path, sample_schema):
        """Test complete documentation generation."""
        src_path = tmp_path / "src"
        src_path.mkdir()

        # Create schema file
        schema_file = src_path / "test.schema.yaml"
        with open(schema_file, 'w') as f:
            yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"

        # Generate documentation
        generate_schema_docs(str(src_path), str(docs_path))

        # Verify documentation created
        doc_file = docs_path / "test.schema.md"
        assert doc_file.exists()

        # Verify index created
        index_file = docs_path / "index.md"
        assert index_file.exists()

    def test_generate_no_schemas(self, tmp_path, capsys):
        """Test generation with no schema files."""
        src_path = tmp_path / "src"
        src_path.mkdir()

        docs_path = tmp_path / "docs"

        generate_schema_docs(str(src_path), str(docs_path))

        captured = capsys.readouterr()
        assert "No YAML schema files found" in captured.out

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

        generate_schema_docs(str(src_path), str(docs_path))

        # Verify all docs created
        for i in range(3):
            doc_file = docs_path / f"test{i}.schema.md"
            assert doc_file.exists()

    def test_generate_with_nested_directories(self, tmp_path, sample_schema):
        """Test generation with nested directory structure."""
        src_path = tmp_path / "src"
        nested1 = src_path / "events" / "notifications"
        nested2 = src_path / "schemas" / "common"
        nested1.mkdir(parents=True)
        nested2.mkdir(parents=True)

        schema1 = nested1 / "email.schema.yaml"
        schema2 = nested2 / "address.schema.yaml"

        for schema_file in [schema1, schema2]:
            with open(schema_file, 'w') as f:
                yaml.dump(sample_schema, f)

        docs_path = tmp_path / "docs"

        generate_schema_docs(str(src_path), str(docs_path))

        # Verify nested docs created
        assert (docs_path / "events" / "notifications" / "email.schema.md").exists()
        assert (docs_path / "schemas" / "common" / "address.schema.md").exists()


class TestMainFunction:
    """Test main function and CLI interface."""

    def test_main_missing_directory(self, tmp_path, capsys):
        """Test handling of missing source directory."""
        src_path = tmp_path / "nonexistent"
        docs_path = tmp_path / "docs"

        # Function should handle gracefully
        generate_schema_docs(str(src_path), str(docs_path))

        captured = capsys.readouterr()
        assert "No YAML schema files found" in captured.out
