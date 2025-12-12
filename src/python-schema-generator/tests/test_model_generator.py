"""Tests for model_generator module."""

from unittest.mock import MagicMock, patch

import pytest

from scripts.model_generator import generate_pydantic_model


class TestGeneratePydanticModel:
    """Tests for generate_pydantic_model function."""

    @patch("scripts.model_generator.subprocess.run")
    def test_calls_datamodel_codegen_with_expected_arguments(self, mock_run):
        """Test successful model generation."""
        # Arrange
        schema_path = "test_model.json"
        output_file = "test_model.py"
        mock_run.return_value = MagicMock(returncode=0, stderr="")

        # Act
        generate_pydantic_model(schema_path, output_file, "TestModel")

        # Assert
        assert mock_run.called
        cmd_args = mock_run.call_args[0][0]
        assert "datamodel-codegen" in cmd_args[0]  # First arg is the executable
        assert "--input" in cmd_args[1]
        assert schema_path in cmd_args[2]
        assert "--output" in cmd_args[3]
        assert output_file in cmd_args[4]
        assert "--class-name" in cmd_args[5]
        assert "TestModel" in cmd_args[6]

    @patch("scripts.model_generator.subprocess.run")
    def test_raises_error_on_generation_failure(self, mock_run):
        """Test that it raises error when generation fails."""
        schema_path = "test_model.json"
        output_file = "test_model.py"
        mock_run.return_value = MagicMock(
            returncode=1, stderr="Error: Invalid schema"
        )

        with pytest.raises(RuntimeError, match="Failed to generate model"):
            generate_pydantic_model(schema_path, output_file, "TestModel")
