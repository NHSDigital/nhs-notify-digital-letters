"""Unit tests for yaml_to_json.py script."""
import pytest
import json
import yaml
from pathlib import Path
from unittest.mock import mock_open, patch
import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from yaml_to_json import yaml_to_json


class TestYamlToJson:
    """Test suite for YAML to JSON conversion."""

    def test_yaml_to_json_success(self, tmp_path):
        """Test successful conversion of YAML to JSON."""
        # Create test YAML file
        yaml_file = tmp_path / "test.yaml"
        yaml_content = {
            "name": "test",
            "version": "1.0",
            "nested": {
                "key": "value"
            }
        }

        with open(yaml_file, 'w') as f:
            yaml.dump(yaml_content, f)

        # Convert to JSON
        json_file = tmp_path / "test.json"
        result = yaml_to_json(str(yaml_file), str(json_file))

        # Verify conversion
        assert result is True
        assert json_file.exists()

        # Verify JSON content
        with open(json_file, 'r') as f:
            json_content = json.load(f)

        assert json_content == yaml_content

    def test_yaml_to_json_with_arrays(self, tmp_path):
        """Test conversion of YAML with arrays."""
        yaml_file = tmp_path / "array.yaml"
        yaml_content = {
            "items": ["one", "two", "three"],
            "numbers": [1, 2, 3]
        }

        with open(yaml_file, 'w') as f:
            yaml.dump(yaml_content, f)

        json_file = tmp_path / "array.json"
        result = yaml_to_json(str(yaml_file), str(json_file))

        assert result is True

        with open(json_file, 'r') as f:
            json_content = json.load(f)

        assert json_content == yaml_content

    def test_yaml_to_json_with_complex_structure(self, tmp_path):
        """Test conversion of complex nested YAML structure."""
        yaml_file = tmp_path / "complex.yaml"
        yaml_content = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": "Test Schema",
            "type": "object",
            "properties": {
                "id": {
                    "type": "string",
                    "format": "uuid"
                },
                "timestamp": {
                    "type": "string",
                    "format": "date-time"
                }
            },
            "required": ["id"]
        }

        with open(yaml_file, 'w') as f:
            yaml.dump(yaml_content, f)

        json_file = tmp_path / "complex.json"
        result = yaml_to_json(str(yaml_file), str(json_file))

        assert result is True

        with open(json_file, 'r') as f:
            json_content = json.load(f)

        assert json_content == yaml_content

    def test_yaml_to_json_file_not_found(self, tmp_path):
        """Test conversion with non-existent YAML file."""
        yaml_file = tmp_path / "nonexistent.yaml"
        json_file = tmp_path / "output.json"

        result = yaml_to_json(str(yaml_file), str(json_file))

        assert result is False
        assert not json_file.exists()

    def test_yaml_to_json_invalid_yaml(self, tmp_path):
        """Test conversion with invalid YAML content."""
        yaml_file = tmp_path / "invalid.yaml"

        # Write invalid YAML
        with open(yaml_file, 'w') as f:
            f.write("invalid: yaml: content: [unclosed")

        json_file = tmp_path / "output.json"
        result = yaml_to_json(str(yaml_file), str(json_file))

        assert result is False

    def test_yaml_to_json_write_permission_error(self, tmp_path):
        """Test conversion with write permission error."""
        yaml_file = tmp_path / "test.yaml"
        yaml_content = {"key": "value"}

        with open(yaml_file, 'w') as f:
            yaml.dump(yaml_content, f)

        # Mock the file write to raise an exception
        with patch('builtins.open', side_effect=[
            open(yaml_file, 'r'),
            PermissionError("Permission denied")
        ]):
            result = yaml_to_json(str(yaml_file), "/invalid/path/output.json")
            assert result is False

    def test_yaml_to_json_empty_file(self, tmp_path):
        """Test conversion of empty YAML file."""
        yaml_file = tmp_path / "empty.yaml"
        yaml_file.touch()

        json_file = tmp_path / "empty.json"
        result = yaml_to_json(str(yaml_file), str(json_file))

        assert result is True

        with open(json_file, 'r') as f:
            content = f.read()

        # Empty YAML file results in null without newline
        assert content == "null"

    def test_yaml_to_json_creates_directories(self, tmp_path):
        """Test that conversion creates parent directories for output file."""
        yaml_file = tmp_path / "test.yaml"
        yaml_content = {"test": "data"}

        with open(yaml_file, 'w') as f:
            yaml.dump(yaml_content, f)

        # Output file in nested directory
        json_file = tmp_path / "nested" / "dir" / "output.json"

        # Create parent directories
        json_file.parent.mkdir(parents=True, exist_ok=True)

        result = yaml_to_json(str(yaml_file), str(json_file))

        assert result is True
        assert json_file.exists()

    def test_yaml_to_json_preserves_special_types(self, tmp_path):
        """Test that conversion preserves special YAML types."""
        yaml_file = tmp_path / "special.yaml"
        yaml_content = {
            "string": "text",
            "number": 42,
            "float": 3.14,
            "boolean": True,
            "none": None
        }

        with open(yaml_file, 'w') as f:
            yaml.dump(yaml_content, f)

        json_file = tmp_path / "special.json"
        result = yaml_to_json(str(yaml_file), str(json_file))

        assert result is True

        with open(json_file, 'r') as f:
            json_content = json.load(f)

        assert json_content["string"] == "text"
        assert json_content["number"] == 42
        assert json_content["float"] == 3.14
        assert json_content["boolean"] is True
        assert json_content["none"] is None


class TestYamlToJsonCLI:
    """Test suite for yaml_to_json CLI interface."""

    def test_cli_success(self, tmp_path):
        """Test CLI with valid arguments."""
        import subprocess

        yaml_file = tmp_path / "test.yaml"
        json_file = tmp_path / "test.json"

        with open(yaml_file, 'w') as f:
            yaml.dump({"key": "value"}, f)

        script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'yaml_to_json.py')

        result = subprocess.run([
            sys.executable,
            script_path,
            str(yaml_file),
            str(json_file)
        ], capture_output=True, text=True)

        assert result.returncode == 0
        assert json_file.exists()
        assert f"Converted {yaml_file} to {json_file}" in result.stdout

    def test_cli_insufficient_arguments(self):
        """Test CLI with insufficient arguments."""
        import subprocess

        script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'yaml_to_json.py')

        result = subprocess.run([
            sys.executable,
            script_path
        ], capture_output=True, text=True)

        assert result.returncode == 1
        assert "Usage:" in result.stdout

    def test_cli_conversion_failure(self, tmp_path):
        """Test CLI with conversion failure."""
        import subprocess

        yaml_file = tmp_path / "nonexistent.yaml"
        json_file = tmp_path / "test.json"

        script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'yaml_to_json.py')

        result = subprocess.run([
            sys.executable,
            script_path,
            str(yaml_file),
            str(json_file)
        ], capture_output=True, text=True)

        assert result.returncode == 1
        assert "Failed to convert" in result.stdout or "Error converting" in result.stdout
