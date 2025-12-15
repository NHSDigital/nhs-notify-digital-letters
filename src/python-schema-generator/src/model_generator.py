"""Model generator using datamodel-code-generator."""

import subprocess
import sys
from pathlib import Path



def generate_pydantic_model(
    schema_path: str, output_file: str, class_name: str
) -> None:
    """Generate a Pydantic model from a JSON schema.

    Args:
        schema_path: The path to the JSON schema file
        output_file: Path where the model should be written
        class_name: Name for the generated Pydantic model class

    Raises:
        RuntimeError: If model generation fails
    """
    datamodel_cmd = str(Path(sys.executable).parent / "datamodel-codegen")
    cmd = [
        datamodel_cmd,
        "--input",
        schema_path,
        "--output",
        output_file,
        "--class-name",
        class_name,
        "--input-file-type",
        "jsonschema",
        "--output-model-type",
        "pydantic_v2.BaseModel",
        "--use-schema-description",
        "--custom-file-header",
        '''"""Generated Pydantic model for NHS Notify Digital Letters events.

This file is auto-generated. Do not edit manually.
"""

'''
    ]
    result = subprocess.run(
        cmd, capture_output=True, text=True, check=False, encoding="utf-8"
    )

    if result.returncode != 0:
        error_msg = f"Failed to generate model: {result.stderr}"
        raise RuntimeError(error_msg)
