"""Schema processor for extracting information from JSON schemas."""

from typing import Any
import re



def extract_model_name(schema: dict[str, Any]) -> str:
    """Extract the model name from a schema.

    Args:
        schema: The JSON schema dictionary

    Returns:
        Model name extracted from the schema's 'title' field
    """
    title = schema.get("title")

    if not title:
        raise ValueError("Schema does not contain a 'title' field")

    # Sanitize model name by removing spaces and special characters
    sanitized_name = re.sub(r'[^a-zA-Z0-9_]', '', title)

    return sanitized_name


def extract_event_type(schema: dict[str, Any]) -> str | None:
    """Extract the event type from a schema if available.

    Args:
        schema: The JSON schema dictionary

    Returns:
        Event type string or None if not found
    """
    properties = schema.get("properties", {})
    type_prop = properties.get("type", {})
    return type_prop.get("const")
