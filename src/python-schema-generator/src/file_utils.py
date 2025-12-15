"""File utilities for the Pydantic model generator."""

import json
from pathlib import Path
from typing import Any
import re



def list_json_schemas(schema_dir: str) -> list[str]:
    """List all flattened JSON schema files in the given directory.

    Args:
        schema_dir: Directory containing JSON schema files

    Returns:
        List of JSON schema filenames
    """
    schema_path = Path(schema_dir)
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema directory not found: {schema_dir}")

    flattened_schema_files = sorted(schema_path.glob("*.flattened.schema.json"))
    return [f.name for f in flattened_schema_files]


def load_json_schema(schema_path: str) -> dict[str, Any]:
    """Load a JSON schema from file.

    Args:
        schema_path: Path to the JSON schema file

    Returns:
        Loaded schema as dictionary
    """
    with open(schema_path, encoding="utf-8") as f:
        return json.load(f)


def write_init_file(output_dir: str, model_names: list[str]) -> None:
    """Write __init__.py file with exports for all generated models.

    Args:
        output_dir: Directory to write __init__.py to
        model_names: List of model class names to export
    """
    init_content = '"""Generated Pydantic models for NHS Notify Digital Letters events."""\n\n'

    for model_name in sorted(model_names):
        module_name = model_name_to_module_name(model_name)
        init_content += f"from .{module_name} import {model_name}\n"

    init_content += "\n__all__ = [\n"
    for model_name in sorted(model_names):
        init_content += f'    "{model_name}",\n'
    init_content += "]\n"

    output_path = Path(output_dir) / "__init__.py"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(init_content)


def model_name_to_module_name(model_name: str) -> str:
    """Convert a model class name to a module name.

    Args:
        model_name: The model class name (e.g., 'PrintLetterAvailable')

    Returns:
        Module name (e.g., 'print_letter_available')
    """
    if not model_name:
        return ""

    # Handle acronym boundaries like "JSONSchema" -> "JSON_Schema"
    # Limited to acronyms of up to 10 letters to avoid catastrophic backtracking issues.
    step1 = re.sub(r"([A-Z]{1,10})([A-Z][a-z])", r"\1_\2", model_name)

    # Insert underscores between lowercase/digit followed by uppercase: "fooBar" -> "foo_Bar"
    step2 = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", step1)

    # Normalise hyphens to underscores and lower-case the result
    return step2.replace("-", "_").lower()
