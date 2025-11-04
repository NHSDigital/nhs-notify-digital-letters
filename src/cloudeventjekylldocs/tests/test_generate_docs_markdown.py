"""Unit tests for generate_docs_markdown.py script."""
import pytest
import yaml
import json
from pathlib import Path
from unittest.mock import patch
import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from generate_docs_markdown import (
    generate_markdown_docs,
    generate_single_markdown_doc,
    generate_markdown_content,
    generate_property_markdown,
    generate_nested_property_markdown,
    generate_hierarchical_markdown_indices,
    generate_markdown_index_from_yaml,
    generate_index_markdown_content
)


@pytest.fixture
def sample_doc_data():
    """Sample documentation data structure."""
    return {
        'metadata': {
            'title': 'Test Schema',
            'description': 'A test schema for documentation',
            'schema_id': 'https://example.com/schemas/test.schema.yaml',
            'schema_version': 'http://json-schema.org/draft-07/schema#',
            'generated': '2024-01-01T12:00:00',
            'source_file': 'test.schema.yaml'
        },
        'properties': {
            'id': {
                'type': 'string',
                'format': 'uuid',
                'description': 'Unique identifier'
            },
            'name': {
                'type': 'string',
                'min_length': 1,
                'max_length': 100,
                'description': 'Name field',
                'examples': ['John Doe']
            }
        },
        'required_fields': ['id', 'name'],
        'type': 'object',
        'raw_schema': {
            'type': 'object',
            'properties': {}
        }
    }


@pytest.fixture
def sample_index_data():
    """Sample index data structure."""
    return {
        'metadata': {
            'title': 'Schema Documentation',
            'description': 'Index of schema documentation',
            'generated': '2024-01-01T12:00:00',
            'directory': '.',
            'type': 'index'
        },
        'navigation': {},
        'schemas': [
            {
                'name': 'test1',
                'source_file': 'test1.schema.yaml',
                'doc_file': 'test1.schema.doc.yaml'
            },
            {
                'name': 'test2',
                'source_file': 'test2.schema.yaml',
                'doc_file': 'test2.schema.doc.yaml'
            }
        ],
        'subdirectories': [],
        'statistics': {
            'schemas_in_directory': 2,
            'total_schemas_in_tree': 2,
            'subdirectories_count': 0
        },
        'generation_info': {
            'generated_at': '2024-01-01 12:00:00',
            'source_directory': '/test/src'
        }
    }


class TestGeneratePropertyMarkdown:
    """Test property markdown generation."""

    def test_generate_basic_property(self):
        """Test generation of basic property markdown."""
        prop_data = {
            'type': 'string',
            'description': 'Test property'
        }

        result = generate_property_markdown('test_field', prop_data)

        assert '### `test_field`' in result
        assert '**Type**: `string`' in result
        assert 'Test property' in result

    def test_generate_property_with_format(self):
        """Test property with format."""
        prop_data = {
            'type': 'string',
            'format': 'email',
            'description': 'Email address'
        }

        result = generate_property_markdown('email', prop_data)

        assert '**Format**: `email`' in result

    def test_generate_property_with_pattern(self):
        """Test property with pattern."""
        prop_data = {
            'type': 'string',
            'pattern': '^[A-Z]+$',
            'description': 'Uppercase letters only'
        }

        result = generate_property_markdown('code', prop_data)

        assert '**Pattern**: `^[A-Z]+$`' in result

    def test_generate_property_with_enum(self):
        """Test property with enum values."""
        prop_data = {
            'type': 'string',
            'enum': ['active', 'inactive', 'pending'],
            'description': 'Status field'
        }

        result = generate_property_markdown('status', prop_data)

        assert '**Allowed values**:' in result
        assert '`active`' in result
        assert '`inactive`' in result
        assert '`pending`' in result

    def test_generate_property_with_const(self):
        """Test property with constant value."""
        prop_data = {
            'type': 'string',
            'const': 'fixed_value',
            'description': 'Constant field'
        }

        result = generate_property_markdown('constant', prop_data)

        assert '**Constant value**: `fixed_value`' in result

    def test_generate_property_with_numeric_constraints(self):
        """Test property with numeric constraints."""
        prop_data = {
            'type': 'integer',
            'minimum': 0,
            'maximum': 100,
            'description': 'Percentage value'
        }

        result = generate_property_markdown('percentage', prop_data)

        assert '**Minimum**: `0`' in result
        assert '**Maximum**: `100`' in result

    def test_generate_property_with_string_length(self):
        """Test property with string length constraints."""
        prop_data = {
            'type': 'string',
            'min_length': 5,
            'max_length': 50,
            'description': 'String with length constraints'
        }

        result = generate_property_markdown('text', prop_data)

        assert '**Minimum length**: `5`' in result
        assert '**Maximum length**: `50`' in result

    def test_generate_property_with_reference(self):
        """Test property with reference."""
        prop_data = {
            'type': 'object',
            'reference': 'other.schema.yaml',
            'description': 'Referenced object'
        }

        result = generate_property_markdown('ref_field', prop_data)

        assert '**Reference**: `other.schema.yaml`' in result

    def test_generate_property_with_examples(self):
        """Test property with examples."""
        prop_data = {
            'type': 'string',
            'description': 'Test property',
            'examples': ['example1', 'example2']
        }

        result = generate_property_markdown('test', prop_data)

        assert '**Examples**:' in result
        assert '`example1`' in result
        assert '`example2`' in result

    def test_generate_property_with_comment(self):
        """Test property with comment."""
        prop_data = {
            'type': 'string',
            'description': 'Test property',
            'comment': 'This is a special field'
        }

        result = generate_property_markdown('test', prop_data)

        assert '**Comment**: This is a special field' in result

    def test_generate_property_with_default(self):
        """Test property with default value."""
        prop_data = {
            'type': 'string',
            'description': 'Test property',
            'default': 'default_value'
        }

        result = generate_property_markdown('test', prop_data)

        assert '**Default**: `default_value`' in result

    def test_generate_property_with_nested_properties(self):
        """Test property with nested object properties."""
        prop_data = {
            'type': 'object',
            'description': 'Address object',
            'properties': {
                'street': {
                    'type': 'string',
                    'description': 'Street name'
                },
                'city': {
                    'type': 'string',
                    'description': 'City name'
                }
            }
        }

        result = generate_property_markdown('address', prop_data)

        assert '#### Properties of `address`' in result
        assert '`street`' in result
        assert '`city`' in result


class TestGenerateNestedPropertyMarkdown:
    """Test nested property markdown generation."""

    def test_generate_nested_property(self):
        """Test generation of nested property."""
        prop_data = {
            'type': 'string',
            'description': 'Nested property'
        }

        result = generate_nested_property_markdown('nested', prop_data, level=4)

        assert '#### `nested`' in result
        assert '**Type**: `string`' in result

    def test_generate_nested_property_with_details(self):
        """Test nested property with additional details."""
        prop_data = {
            'type': 'string',
            'format': 'email',
            'pattern': '^[a-z]+$',
            'description': 'Email field'
        }

        result = generate_nested_property_markdown('email', prop_data, level=5)

        assert '##### `email`' in result
        assert '**Format**: `email`' in result
        assert '**Pattern**: `^[a-z]+$`' in result

    def test_generate_nested_property_with_enum(self):
        """Test nested property with enum."""
        prop_data = {
            'type': 'string',
            'enum': ['opt1', 'opt2'],
            'description': 'Options'
        }

        result = generate_nested_property_markdown('options', prop_data)

        assert '**Allowed values**:' in result


class TestGenerateMarkdownContent:
    """Test markdown content generation."""

    def test_generate_basic_markdown(self, sample_doc_data):
        """Test generation of basic markdown content."""
        result = generate_markdown_content(sample_doc_data)

        # Check front matter
        assert '---' in result
        assert 'title: "Test Schema"' in result
        assert 'description: "A test schema for documentation"' in result
        assert 'schema_id: "https://example.com/schemas/test.schema.yaml"' in result

        # Check content
        assert '# Test Schema' in result
        assert '## Schema Information' in result
        assert '## Properties' in result

    def test_generate_markdown_with_parent(self, sample_doc_data):
        """Test markdown generation with parent title."""
        result = generate_markdown_content(sample_doc_data, parent_title='Parent Schema')

        assert 'parent: "Parent Schema"' in result

    def test_generate_markdown_with_schema_documentation_parent(self, sample_doc_data):
        """Test markdown with 'Schema Documentation' parent."""
        result = generate_markdown_content(sample_doc_data, parent_title='Schema Documentation')

        assert 'parent: "Schemas"' in result

    def test_generate_markdown_with_subdirectory_parent(self, sample_doc_data):
        """Test markdown with subdirectory parent."""
        result = generate_markdown_content(sample_doc_data, parent_title='Schema Documentation - Events')

        assert 'parent: "Events"' in result

    def test_generate_markdown_for_bundle_schema(self):
        """Test markdown generation for bundle schema."""
        doc_data = {
            'metadata': {
                'title': 'Test Schema',
                'description': 'Test',
                'schema_id': 'test',
                'schema_version': 'draft-07',
                'generated': '2024-01-01',
                'source_file': 'test.bundle.schema.yaml'
            },
            'properties': {},
            'required_fields': []
        }

        result = generate_markdown_content(doc_data)

        assert 'title: "Test Schema.Bundle"' in result
        assert 'parent: "Test Schema"' in result

    def test_generate_markdown_for_flattened_schema(self):
        """Test markdown generation for flattened schema."""
        doc_data = {
            'metadata': {
                'title': 'Test Schema',
                'description': 'Test',
                'schema_id': 'test',
                'schema_version': 'draft-07',
                'generated': '2024-01-01',
                'source_file': 'test.flattened.schema.yaml'
            },
            'properties': {},
            'required_fields': []
        }

        result = generate_markdown_content(doc_data)

        assert 'title: "Test Schema.Flattened"' in result
        assert 'parent: "Test Schema"' in result

    def test_generate_markdown_with_properties(self, sample_doc_data):
        """Test markdown with properties in front matter."""
        result = generate_markdown_content(sample_doc_data)

        assert 'properties:' in result
        assert 'id:' in result
        assert 'name:' in result

    def test_generate_markdown_with_required_fields(self, sample_doc_data):
        """Test markdown with required fields."""
        result = generate_markdown_content(sample_doc_data)

        assert '## Required Fields' in result
        assert '- `id`' in result
        assert '- `name`' in result

    def test_generate_markdown_with_inheritance(self):
        """Test markdown with inheritance information."""
        doc_data = {
            'metadata': {
                'title': 'Test',
                'description': 'Test',
                'schema_id': 'test',
                'schema_version': 'draft-07',
                'generated': '2024-01-01',
                'source_file': 'test.yaml'
            },
            'properties': {},
            'required_fields': [],
            'inheritance': [
                {'reference': 'base.schema.yaml'},
                {'reference': 'mixin.schema.yaml'}
            ]
        }

        result = generate_markdown_content(doc_data)

        assert '## Inheritance' in result
        assert '`base.schema.yaml`' in result
        assert '`mixin.schema.yaml`' in result

    def test_generate_markdown_with_additional_properties(self):
        """Test markdown with additional properties info."""
        doc_data = {
            'metadata': {
                'title': 'Test',
                'description': 'Test',
                'schema_id': 'test',
                'schema_version': 'draft-07',
                'generated': '2024-01-01',
                'source_file': 'test.yaml'
            },
            'properties': {},
            'required_fields': [],
            'additional_properties': {'allowed': False}
        }

        result = generate_markdown_content(doc_data)

        assert '## Additional Properties' in result
        assert 'not allowed' in result

    def test_generate_markdown_with_constraints(self):
        """Test markdown with constraints."""
        doc_data = {
            'metadata': {
                'title': 'Test',
                'description': 'Test',
                'schema_id': 'test',
                'schema_version': 'draft-07',
                'generated': '2024-01-01',
                'source_file': 'test.yaml'
            },
            'properties': {},
            'required_fields': [],
            'constraints': {
                'minProperties': 1,
                'maxProperties': 10
            }
        }

        result = generate_markdown_content(doc_data)

        assert '## Constraints' in result
        assert 'minProperties' in result

    def test_generate_markdown_with_examples(self):
        """Test markdown with examples."""
        doc_data = {
            'metadata': {
                'title': 'Test',
                'description': 'Test',
                'schema_id': 'test',
                'schema_version': 'draft-07',
                'generated': '2024-01-01',
                'source_file': 'test.yaml'
            },
            'properties': {},
            'required_fields': [],
            'examples': [
                {'id': '123', 'name': 'test'}
            ]
        }

        result = generate_markdown_content(doc_data)

        assert '## Examples' in result
        assert '```json' in result

    def test_generate_markdown_with_raw_schema(self, sample_doc_data):
        """Test markdown with raw schema."""
        result = generate_markdown_content(sample_doc_data)

        assert '## Raw Schema' in result
        assert '```yaml' in result


class TestGenerateIndexMarkdownContent:
    """Test index markdown content generation."""

    def test_generate_root_index(self, sample_index_data):
        """Test generation of root index markdown."""
        result = generate_index_markdown_content(sample_index_data)

        assert 'title: "Schemas"' in result
        assert '# Schemas' in result
        assert '## Schemas in this directory' in result

    def test_generate_subdirectory_index(self):
        """Test generation of subdirectory index."""
        index_data = {
            'metadata': {
                'title': 'Schema Documentation - Events',
                'description': 'Event schemas',
                'generated': '2024-01-01',
                'directory': 'events'
            },
            'navigation': {
                'parent': {
                    'title': 'Schema Documentation',
                    'directory': '.'
                }
            },
            'schemas': [],
            'subdirectories': [],
            'statistics': {
                'schemas_in_directory': 0,
                'total_schemas_in_tree': 0,
                'subdirectories_count': 0
            },
            'generation_info': {
                'generated_at': '2024-01-01',
                'source_directory': '/test'
            }
        }

        result = generate_index_markdown_content(index_data, Path('events'))

        assert 'title: "Events"' in result
        assert 'parent: "Schemas"' in result

    def test_generate_index_with_parent_navigation(self):
        """Test index with parent navigation link."""
        index_data = {
            'metadata': {
                'title': 'Schema Documentation - SubDir',
                'description': 'Subdirectory',
                'generated': '2024-01-01',
                'directory': 'subdir'
            },
            'navigation': {
                'parent': {
                    'title': 'Schema Documentation',
                    'directory': 'root'
                }
            },
            'schemas': [],
            'subdirectories': [],
            'statistics': {'schemas_in_directory': 0, 'total_schemas_in_tree': 0, 'subdirectories_count': 0},
            'generation_info': {'generated_at': '2024-01-01', 'source_directory': '/test'}
        }

        result = generate_index_markdown_content(index_data)

        assert '[↑ Parent Directory]' in result

    def test_generate_index_with_schemas(self, sample_index_data):
        """Test index with schema listings."""
        result = generate_index_markdown_content(sample_index_data)

        assert '- [test1]' in result
        assert '- [test2]' in result

    def test_generate_index_with_subdirectories(self):
        """Test index with subdirectory listings."""
        index_data = {
            'metadata': {
                'title': 'Schema Documentation',
                'description': 'Index',
                'generated': '2024-01-01',
                'directory': '.'
            },
            'navigation': {},
            'schemas': [],
            'subdirectories': [
                {'name': 'events', 'path': 'events/index.yaml', 'directory': 'events'},
                {'name': 'schemas', 'path': 'schemas/index.yaml', 'directory': 'schemas'}
            ],
            'statistics': {'schemas_in_directory': 0, 'total_schemas_in_tree': 0, 'subdirectories_count': 2},
            'generation_info': {'generated_at': '2024-01-01', 'source_directory': '/test'}
        }

        result = generate_index_markdown_content(index_data)

        assert '## Subdirectories' in result
        assert '- [events/]' in result
        assert '- [schemas/]' in result

    def test_generate_index_with_has_children(self, sample_index_data):
        """Test index with has_children flag."""
        result = generate_index_markdown_content(sample_index_data)

        assert 'has_children: true' in result

    def test_generate_index_with_statistics(self, sample_index_data):
        """Test index with generation statistics."""
        result = generate_index_markdown_content(sample_index_data)

        assert '## Generation Info' in result
        assert '**Schemas in this directory**: 2' in result
        assert '**Total schemas in tree**: 2' in result


class TestGenerateSingleMarkdownDoc:
    """Test single markdown document generation."""

    def test_generate_single_doc(self, tmp_path, sample_doc_data):
        """Test generation of single markdown document."""
        # Create YAML doc file
        yaml_path = tmp_path / "yaml"
        yaml_path.mkdir()
        doc_file = yaml_path / "test.schema.doc.yaml"

        with open(doc_file, 'w') as f:
            yaml.dump(sample_doc_data, f)

        # Generate markdown
        md_path = tmp_path / "markdown"
        generate_single_markdown_doc(doc_file, yaml_path, md_path)

        # Verify markdown file created
        md_file = md_path / "test.schema.md"
        assert md_file.exists()

        # Verify content
        with open(md_file, 'r') as f:
            content = f.read()

        assert 'title: "Test Schema"' in content

    def test_generate_with_nested_path(self, tmp_path, sample_doc_data):
        """Test generation with nested directory structure."""
        yaml_path = tmp_path / "yaml"
        nested_dir = yaml_path / "events" / "notifications"
        nested_dir.mkdir(parents=True)

        doc_file = nested_dir / "email.schema.doc.yaml"
        with open(doc_file, 'w') as f:
            yaml.dump(sample_doc_data, f)

        md_path = tmp_path / "markdown"
        generate_single_markdown_doc(doc_file, yaml_path, md_path)

        # Verify nested structure preserved
        md_file = md_path / "events" / "notifications" / "email.schema.md"
        assert md_file.exists()

    def test_generate_with_parent_index(self, tmp_path, sample_doc_data):
        """Test generation with parent index.yaml present."""
        yaml_path = tmp_path / "yaml"
        yaml_path.mkdir()

        # Create index.yaml
        index_data = {
            'metadata': {
                'title': 'Parent Index'
            }
        }
        with open(yaml_path / "index.yaml", 'w') as f:
            yaml.dump(index_data, f)

        # Create doc file
        doc_file = yaml_path / "test.schema.doc.yaml"
        with open(doc_file, 'w') as f:
            yaml.dump(sample_doc_data, f)

        md_path = tmp_path / "markdown"
        generate_single_markdown_doc(doc_file, yaml_path, md_path)

        md_file = md_path / "test.schema.md"
        with open(md_file, 'r') as f:
            content = f.read()

        # Should use parent title
        assert 'parent:' in content

    def test_generate_invalid_yaml(self, tmp_path):
        """Test handling of invalid YAML file."""
        yaml_path = tmp_path / "yaml"
        yaml_path.mkdir()

        doc_file = yaml_path / "invalid.doc.yaml"
        with open(doc_file, 'w') as f:
            f.write("{ invalid yaml }")

        md_path = tmp_path / "markdown"

        # Should not raise exception
        generate_single_markdown_doc(doc_file, yaml_path, md_path)


class TestGenerateMarkdownIndexFromYaml:
    """Test markdown index generation from YAML."""

    def test_generate_markdown_index(self, tmp_path, sample_index_data):
        """Test generation of markdown index from YAML."""
        yaml_path = tmp_path / "yaml"
        yaml_path.mkdir()

        index_file = yaml_path / "index.yaml"
        with open(index_file, 'w') as f:
            yaml.dump(sample_index_data, f)

        md_path = tmp_path / "markdown"
        generate_markdown_index_from_yaml(index_file, yaml_path, md_path)

        md_index = md_path / "index.md"
        assert md_index.exists()

        with open(md_index, 'r') as f:
            content = f.read()

        assert 'title: "Schemas"' in content

    def test_generate_invalid_index(self, tmp_path):
        """Test handling of invalid index YAML."""
        yaml_path = tmp_path / "yaml"
        yaml_path.mkdir()

        index_file = yaml_path / "index.yaml"
        with open(index_file, 'w') as f:
            f.write("{ invalid }")

        md_path = tmp_path / "markdown"

        # Should not raise exception
        generate_markdown_index_from_yaml(index_file, yaml_path, md_path)


class TestGenerateHierarchicalMarkdownIndices:
    """Test hierarchical markdown indices generation."""

    def test_generate_flat_indices(self, tmp_path, sample_index_data):
        """Test generation of flat index structure."""
        yaml_path = tmp_path / "yaml"
        yaml_path.mkdir()

        index_file = yaml_path / "index.yaml"
        with open(index_file, 'w') as f:
            yaml.dump(sample_index_data, f)

        md_path = tmp_path / "markdown"
        generate_hierarchical_markdown_indices(yaml_path, md_path)

        assert (md_path / "index.md").exists()

    def test_generate_nested_indices(self, tmp_path, sample_index_data):
        """Test generation of nested index structure."""
        yaml_path = tmp_path / "yaml"
        events_dir = yaml_path / "events"
        events_dir.mkdir(parents=True)

        # Root index
        with open(yaml_path / "index.yaml", 'w') as f:
            yaml.dump(sample_index_data, f)

        # Subdirectory index
        with open(events_dir / "index.yaml", 'w') as f:
            yaml.dump(sample_index_data, f)

        md_path = tmp_path / "markdown"
        generate_hierarchical_markdown_indices(yaml_path, md_path)

        assert (md_path / "index.md").exists()
        assert (md_path / "events" / "index.md").exists()


class TestGenerateMarkdownDocs:
    """Test main markdown documentation generation."""

    def test_generate_docs(self, tmp_path, sample_doc_data):
        """Test complete markdown documentation generation."""
        yaml_path = tmp_path / "yaml"
        yaml_path.mkdir()

        doc_file = yaml_path / "test.schema.doc.yaml"
        with open(doc_file, 'w') as f:
            yaml.dump(sample_doc_data, f)

        md_path = tmp_path / "markdown"
        generate_markdown_docs(str(yaml_path), str(md_path))

        # Verify markdown created
        md_file = md_path / "test.schema.md"
        assert md_file.exists()

    def test_generate_no_yaml_docs(self, tmp_path, capsys):
        """Test generation with no YAML doc files."""
        yaml_path = tmp_path / "yaml"
        yaml_path.mkdir()

        md_path = tmp_path / "markdown"
        generate_markdown_docs(str(yaml_path), str(md_path))

        captured = capsys.readouterr()
        assert "No YAML documentation files found" in captured.out

    def test_generate_multiple_docs(self, tmp_path, sample_doc_data):
        """Test generation of multiple markdown documents."""
        yaml_path = tmp_path / "yaml"
        yaml_path.mkdir()

        for i in range(3):
            doc_file = yaml_path / f"test{i}.schema.doc.yaml"
            with open(doc_file, 'w') as f:
                yaml.dump(sample_doc_data, f)

        md_path = tmp_path / "markdown"
        generate_markdown_docs(str(yaml_path), str(md_path))

        # Verify all created
        for i in range(3):
            assert (md_path / f"test{i}.schema.md").exists()


class TestMainFunction:
    """Test main function and CLI interface."""

    def test_main_missing_directory(self, tmp_path, capsys):
        """Test handling of missing directory."""
        yaml_path = tmp_path / "nonexistent"
        md_path = tmp_path / "markdown"

        generate_markdown_docs(str(yaml_path), str(md_path))

        captured = capsys.readouterr()
        assert "No YAML documentation files found" in captured.out
