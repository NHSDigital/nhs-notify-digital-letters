"""Model generator using datamodel-code-generator."""

from pathlib import Path
from datamodel_code_generator import DataModelType, InputFileType, generate



def generate_pydantic_model(
    schema: str, output_file_path: Path, class_name: str
) -> None:
    """Generate a Pydantic model from a JSON schema.

    Args:
        schema_path: The path to the JSON schema file
        output_file: Path where the model should be written
        class_name: Name for the generated Pydantic model class

    Raises:
        RuntimeError: If model generation fails
    """

    generate(
        schema,
        input_file_type=InputFileType.JsonSchema,
        output=output_file_path,
        output_model_type=DataModelType.PydanticV2BaseModel,
        class_name=class_name,
        use_schema_description=True,
        custom_file_header='''"""Generated Pydantic model for NHS Notify Digital Letters events.

This file is auto-generated. Do not edit manually.
"""

'''
    )
