"""Tests for model_generator module."""

from pathlib import Path
from unittest.mock import patch

import pytest
from datamodel_code_generator import DataModelType, InputFileType

from src.model_generator import generate_pydantic_model


class TestGeneratePydanticModel:
    """Tests for generate_pydantic_model function."""

    @patch("src.model_generator.generate")
    def test_calls_datamodel_codegen_with_expected_arguments(self, mock_generate):
        """Test successful model generation."""
        # Arrange
        schema = '{"type": "object", "properties": {"name": {"type": "string"}}}'
        output_file = Path("test_model.py")

        # Act
        generate_pydantic_model(schema, output_file, "TestModel")

        # Assert
        mock_generate.assert_called_once_with(
            schema,
            input_file_type=InputFileType.JsonSchema,
            output=output_file,
            output_model_type=DataModelType.PydanticV2BaseModel,
            class_name="TestModel",
            use_schema_description=True,
            use_subclass_enum=True,
            custom_file_header='''"""Generated Pydantic model for NHS Notify Digital Letters events.

This file is auto-generated. Do not edit manually.
"""

'''
        )

    @patch("src.model_generator.generate")
    def test_raises_error_on_generation_failure(self, mock_generate):
        """Test that it raises error when generation fails."""
        schema = '{"type": "object", "properties": {"name": {"type": "string"}}}'
        output_file = Path("test_model.py")
        mock_generate.side_effect = RuntimeError("Invalid schema")

        with pytest.raises(RuntimeError, match="Invalid schema"):
            generate_pydantic_model(schema, output_file, "TestModel")
