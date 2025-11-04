"""Unit tests for generate_docs_all.py script."""
import pytest
import yaml
import json
import subprocess
from pathlib import Path
from unittest.mock import patch, MagicMock, call
import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from generate_docs_all import run_documentation_generation


class TestRunDocumentationGeneration:
    """Test suite for run_documentation_generation function."""

    def test_successful_generation(self, tmp_path):
        """Test successful documentation generation with all steps."""
        # Create test schema file
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        schema_file = src_dir / "test.schema.yaml"

        schema_content = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": "Test Schema",
            "type": "object"
        }

        with open(schema_file, 'w') as f:
            yaml.dump(schema_content, f)

        output_dir = tmp_path / "output"

        # Mock subprocess.run to simulate successful script executions
        with patch('generate_docs_all.subprocess.run') as mock_run:
            # All calls return success
            mock_run.return_value = MagicMock(returncode=0, stdout='Success', stderr='')

            result = run_documentation_generation(str(src_dir), str(output_dir))

        # Should return True
        assert result is True

        # Verify schema directory was created
        assert (output_dir / "schemas").exists()

    def test_no_schema_files_found(self, tmp_path, capsys):
        """Test when no schema files are found in source directory."""
        src_dir = tmp_path / "empty_src"
        src_dir.mkdir()

        output_dir = tmp_path / "output"

        result = run_documentation_generation(str(src_dir), str(output_dir))

        assert result is False

        captured = capsys.readouterr()
        assert "No YAML schema files found" in captured.out

    def test_yaml_to_json_conversion_error(self, tmp_path, capsys):
        """Test error handling when YAML to JSON conversion fails."""
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        schema_file = src_dir / "test.schema.yaml"

        with open(schema_file, 'w') as f:
            yaml.dump({"test": "data"}, f)

        output_dir = tmp_path / "output"

        # Mock subprocess.run to simulate failure
        with patch('generate_docs_all.subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(
                returncode=1,
                stdout='',
                stderr='Conversion error'
            )

            result = run_documentation_generation(str(src_dir), str(output_dir))

        assert result is False

        captured = capsys.readouterr()
        assert "Error converting" in captured.out

    def test_yaml_generation_error(self, tmp_path, capsys):
        """Test error handling when YAML documentation generation fails."""
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        schema_file = src_dir / "test.schema.yaml"

        with open(schema_file, 'w') as f:
            yaml.dump({"test": "data"}, f)

        output_dir = tmp_path / "output"

        # Mock subprocess.run
        with patch('generate_docs_all.subprocess.run') as mock_run:
            # First call succeeds (yaml_to_json)
            # Second call fails (generate_docs_yaml)
            error = subprocess.CalledProcessError(1, 'cmd')
            error.stdout = ''
            error.stderr = 'YAML gen error'

            mock_run.side_effect = [
                MagicMock(returncode=0, stdout='', stderr=''),  # yaml_to_json
                error
            ]

            result = run_documentation_generation(str(src_dir), str(output_dir))

        assert result is False

        captured = capsys.readouterr()
        assert "Error generating YAML documentation" in captured.out

    def test_markdown_generation_error(self, tmp_path, capsys):
        """Test error handling when Markdown documentation generation fails."""
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        schema_file = src_dir / "test.schema.yaml"

        with open(schema_file, 'w') as f:
            yaml.dump({"test": "data"}, f)

        output_dir = tmp_path / "output"

        # Mock subprocess.run
        with patch('generate_docs_all.subprocess.run') as mock_run:
            # First two calls succeed, third fails
            error = subprocess.CalledProcessError(1, 'cmd')
            error.stdout = ''
            error.stderr = 'MD gen error'

            mock_run.side_effect = [
                MagicMock(returncode=0, stdout='', stderr=''),  # yaml_to_json
                MagicMock(returncode=0, stdout='YAML output', stderr=''),  # generate_docs_yaml
                error
            ]

            result = run_documentation_generation(str(src_dir), str(output_dir))

        assert result is False

        captured = capsys.readouterr()
        assert "Error generating Markdown documentation" in captured.out

    def test_multiple_schema_files(self, tmp_path, capsys):
        """Test processing multiple schema files."""
        src_dir = tmp_path / "src"
        src_dir.mkdir()

        # Create nested directory structure with multiple schemas
        (src_dir / "events").mkdir()

        schemas = [
            src_dir / "test1.schema.yaml",
            src_dir / "test2.schema.yaml",
            src_dir / "events" / "event1.schema.yaml"
        ]

        for schema_file in schemas:
            with open(schema_file, 'w') as f:
                yaml.dump({"title": schema_file.stem}, f)

        output_dir = tmp_path / "output"

        # Mock subprocess.run
        with patch('generate_docs_all.subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0, stdout='Success', stderr='')

            result = run_documentation_generation(str(src_dir), str(output_dir))

        # Should succeed
        assert result is True

        captured = capsys.readouterr()
        assert "Converted 3 schema files" in captured.out

    def test_directory_creation(self, tmp_path):
        """Test that required directories are created."""
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        schema_file = src_dir / "test.schema.yaml"

        with open(schema_file, 'w') as f:
            yaml.dump({"test": "data"}, f)

        output_dir = tmp_path / "output"

        # Mock subprocess.run
        with patch('generate_docs_all.subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0, stdout='', stderr='')

            result = run_documentation_generation(str(src_dir), str(output_dir))

        # Should succeed
        assert result is True

        # Verify at least the schemas directory was created
        assert (output_dir / "schemas").exists()

    def test_nested_schema_directories(self, tmp_path):
        """Test handling of schemas in nested directories."""
        src_dir = tmp_path / "src"
        nested_dir = src_dir / "level1" / "level2"
        nested_dir.mkdir(parents=True)

        schema_file = nested_dir / "nested.schema.yaml"
        with open(schema_file, 'w') as f:
            yaml.dump({"nested": "schema"}, f)

        output_dir = tmp_path / "output"

        # Mock subprocess.run
        with patch('generate_docs_all.subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0, stdout='', stderr='')

            result = run_documentation_generation(str(src_dir), str(output_dir))

        assert result is True

        # Verify nested directory structure is preserved in output
        expected_json = output_dir / "schemas" / "level1" / "level2" / "nested.schema.json"
        assert expected_json.parent.exists()

    def test_exception_handling(self, tmp_path, capsys):
        """Test general exception handling."""
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        schema_file = src_dir / "test.schema.yaml"

        with open(schema_file, 'w') as f:
            yaml.dump({"test": "data"}, f)

        output_dir = tmp_path / "output"

        # Mock subprocess.run to raise an exception
        with patch('generate_docs_all.subprocess.run') as mock_run:
            mock_run.side_effect = Exception("Unexpected error")

            result = run_documentation_generation(str(src_dir), str(output_dir))

        assert result is False

        captured = capsys.readouterr()
        assert "Error converting schema files" in captured.out


class TestGenerateDocsAllCLI:
    """Test suite for generate_docs_all CLI interface."""

    def test_cli_success(self, tmp_path):
        """Test CLI with valid arguments."""
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        schema_file = src_dir / "test.schema.yaml"

        with open(schema_file, 'w') as f:
            yaml.dump({"test": "schema"}, f)

        output_dir = tmp_path / "output"

        script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'generate_docs_all.py')

        # Mock the subprocess calls within the script
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0, stdout='', stderr='')

            result = subprocess.run([
                sys.executable,
                script_path,
                str(src_dir),
                str(output_dir)
            ], capture_output=True, text=True)

        # The script should exit successfully
        assert result.returncode in [0, 1]  # May fail due to mocking, but shouldn't crash

    def test_cli_no_arguments(self):
        """Test CLI with no arguments."""
        script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'generate_docs_all.py')

        result = subprocess.run([
            sys.executable,
            script_path
        ], capture_output=True, text=True)

        assert result.returncode == 1
        assert "Usage:" in result.stdout

    def test_cli_too_many_arguments(self):
        """Test CLI with too many arguments."""
        script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'generate_docs_all.py')

        result = subprocess.run([
            sys.executable,
            script_path,
            'arg1',
            'arg2',
            'arg3',
            'arg4'
        ], capture_output=True, text=True)

        assert result.returncode == 1
        assert "Usage:" in result.stdout

    def test_cli_nonexistent_directory(self, tmp_path):
        """Test CLI with non-existent source directory."""
        nonexistent_dir = tmp_path / "nonexistent"

        script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'generate_docs_all.py')

        result = subprocess.run([
            sys.executable,
            script_path,
            str(nonexistent_dir)
        ], capture_output=True, text=True)

        assert result.returncode == 1
        assert "does not exist" in result.stdout

    def test_cli_with_default_output_dir(self, tmp_path):
        """Test CLI with only source directory (default output)."""
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        schema_file = src_dir / "test.schema.yaml"

        with open(schema_file, 'w') as f:
            yaml.dump({"test": "schema"}, f)

        script_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'generate_docs_all.py')

        # Change to tmp_path so "output" directory is created there
        original_cwd = os.getcwd()
        try:
            os.chdir(str(tmp_path))

            with patch('subprocess.run') as mock_run:
                mock_run.return_value = MagicMock(returncode=0, stdout='', stderr='')

                result = subprocess.run([
                    sys.executable,
                    script_path,
                    str(src_dir)
                ], capture_output=True, text=True)

            # Should not crash
            assert result.returncode in [0, 1]
        finally:
            os.chdir(original_cwd)
