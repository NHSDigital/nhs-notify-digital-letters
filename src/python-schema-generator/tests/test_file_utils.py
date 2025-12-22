"""Tests for file_utils module."""

import json

import pytest

from src.file_utils import (
    list_json_schemas,
    load_json_schema,
    parse_json_schema,
    write_init_file,
    model_name_to_module_name
)


class TestListJsonSchemas:
    """Tests for list_json_schemas function."""

    def test_lists_json_schema_files(self, tmp_path):
        """Test that it finds JSON schema files."""
        (tmp_path / "test1.flattened.schema.json").write_text("{}")
        (tmp_path / "test2.flattened.schema.json").write_text("{}")
        (tmp_path / "not-flattened.schema.json").write_text("{}")
        (tmp_path / "not-a-schema.json").write_text("{}")

        result = list_json_schemas(str(tmp_path))

        assert len(result) == 2
        assert "test1.flattened.schema.json" in result
        assert "test2.flattened.schema.json" in result
        assert "not-flattened.schema.json" not in result
        assert "not-a-schema.json" not in result

    def test_returns_sorted_list(self, tmp_path):
        """Test that results are sorted."""
        (tmp_path / "zebra.flattened.schema.json").write_text("{}")
        (tmp_path / "alpha.flattened.schema.json").write_text("{}")

        result = list_json_schemas(str(tmp_path))

        assert result == ["alpha.flattened.schema.json", "zebra.flattened.schema.json"]

    def test_raises_error_if_directory_not_found(self):
        """Test that it raises FileNotFoundError for missing directory."""
        with pytest.raises(FileNotFoundError):
            list_json_schemas("/nonexistent/path")


class TestLoadJsonSchema:
    """Tests for load_json_schema function."""

    def test_loads_valid_json_schema(self, tmp_path):
        """Test loading a valid JSON schema."""
        schema_file = tmp_path / "test.schema.json"
        schema_content = json.dumps({"title": "TestSchema", "type": "object"})
        schema_file.write_text(schema_content)

        result = load_json_schema(str(schema_file))

        assert result == schema_content


class TestParseJsonSchema:
    """Tests for parse_json_schema function."""

    def test_parses_valid_json_schema(self):
        """Test loading a valid JSON schema."""
        schema_content = { "title": "TestSchema", "type": "object" }

        result = parse_json_schema(json.dumps(schema_content))

        assert result == schema_content

    def test_raises_error_for_invalid_json(self):
        """Test that it raises error for invalid JSON."""
        invalid_json = "not valid json"

        with pytest.raises(json.JSONDecodeError):
            parse_json_schema(invalid_json)

class TestWriteInitFile:
    """Tests for write_init_file function."""

    def test_writes_init_file_with_imports(self, tmp_path):
        """Test writing __init__.py with model imports."""
        model_names = ["ModelA", "ModelB", "ModelC"]

        write_init_file(str(tmp_path), model_names)

        init_file = tmp_path / "__init__.py"
        assert init_file.exists()

        content = init_file.read_text()
        assert "from .model_a import ModelA" in content
        assert "from .model_b import ModelB" in content
        assert "from .model_c import ModelC" in content
        assert '__all__ = [' in content
        assert '"ModelA",' in content
        assert '"ModelB",' in content
        assert '"ModelC",' in content
        assert ']' in content

    def test_sorts_model_names(self, tmp_path):
        """Test that model names are sorted in __init__.py."""
        model_names = ["ZebraModel", "AlphaModel"]

        write_init_file(str(tmp_path), model_names)

        init_file = tmp_path / "__init__.py"
        assert init_file.exists()

        content = init_file.read_text()
        alpha_pos = content.index("AlphaModel")
        zebra_pos = content.index("ZebraModel")
        assert alpha_pos < zebra_pos


class TestModelNameToModuleName:
    """Tests for model_name_to_module_name function."""

    def test_converts_pascal_case_to_snake_case(self):
        """Test converting model name to snake_case filename."""
        result = model_name_to_module_name("PrintLetterAvailable")

        assert result == "print_letter_available"

    def test_handles_consecutive_capitals(self):
        """Test handling consecutive capital letters."""
        result = model_name_to_module_name("PDFDocument")

        assert result == "pdf_document"

    def test_handles_single_word(self):
        """Test handling single word titles."""
        result = model_name_to_module_name("Letter")

        assert result == "letter"

    def test_handles_digits_in_name(self):
        """Test handling digits in model names."""
        result = model_name_to_module_name("ModelV2Update")

        assert result == "model_v2_update"

    def test_handles_hyphens(self):
        """Test handling hyphens."""
        result = model_name_to_module_name("Model-With-Hyphens")

        assert result == "model_with_hyphens"

    def test_handles_empty_string(self):
        """Test that an empty string is returned for empty input."""
        result = model_name_to_module_name("")

        assert result == ""
