"""Tests for schema_processor module."""

import pytest

from scripts.schema_processor import (
    extract_event_type,
    extract_model_name,
)


class TestExtractModelName:
    """Tests for extract_model_name function."""

    def test_extracts_title_from_schema(self):
        """Test extracting model name from schema title."""
        schema = {"title": "PrintLetterAvailable", "type": "object"}

        result = extract_model_name(schema)

        assert result == "PrintLetterAvailable"

    def test_removes_invalid_characters(self):
        """Tes handling spaces and special characters."""
        schema = {"title": "Print-Letter Available!_v2", "type": "object"}

        result = extract_model_name(schema)

        assert result == "PrintLetterAvailable_v2"

    def test_raises_error_if_no_title(self):
        """Test that it raises error if schema has no title."""
        schema = {"type": "object"}

        with pytest.raises(ValueError, match="does not contain a 'title' field"):
            extract_model_name(schema)


class TestExtractEventType:
    """Tests for extract_event_type function."""

    def test_extracts_event_type_from_schema(self):
        """Test extracting event type from schema."""
        schema = {
            "properties": {
                "type": {"const": "uk.nhs.notify.digital.letters.letter.available.v1"}
            }
        }

        result = extract_event_type(schema)

        assert result == "uk.nhs.notify.digital.letters.letter.available.v1"

    def test_returns_none_if_no_type_property(self):
        """Test that it returns None if no type property exists."""
        schema = {"properties": {}}

        result = extract_event_type(schema)

        assert result is None

    def test_returns_none_if_no_const(self):
        """Test that it returns None if type has no const field."""
        schema = {"properties": {"type": {"type": "string"}}}

        result = extract_event_type(schema)

        assert result is None
