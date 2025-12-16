#!/usr/bin/env python3
"""CLI tool to generate Pydantic v2 models from JSON schemas.

This tool reads JSON schemas for NHS Notify Digital Letters events and
generates corresponding Pydantic v2 models that can be used by Python
lambda functions for event validation and parsing.
"""

import argparse
import sys
from pathlib import Path

from file_utils import (
    list_json_schemas,
    load_json_schema,
    parse_json_schema,
    model_name_to_module_name,
    write_init_file,
)
from model_generator import generate_pydantic_model
from schema_processor import (
    extract_model_name,
)


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments.

    Returns:
        Parsed arguments
    """
    parser = argparse.ArgumentParser(
    )
    parser.add_argument(
        "--input-dir",
        type=str,
        required=True,
        help="Directory containing JSON schema files",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        required=True,
        help="Directory to write generated Pydantic models (must exist)",
    )
    return parser.parse_args()


def main(args) -> int:
    """Main entry point for the generator.

    Returns:
        Exit code (0 for success, 1 for failure)
    """
    try:
        print(f"Generating models in: {args.output_dir}")

        schema_filenames = list_json_schemas(args.input_dir)
        print(f"Found {len(schema_filenames)} schema files")

        generated_models = []
        for schema_filename in schema_filenames:
            schema_path = str(Path(args.input_dir) / schema_filename)
            string_schema = load_json_schema(schema_path)
            schema = parse_json_schema(string_schema)

            model_name = extract_model_name(schema)
            output_filename = model_name_to_module_name(model_name) + ".py"
            output_file_path = Path(args.output_dir) / output_filename

            generate_pydantic_model(
                string_schema, output_file_path, model_name
            )

            generated_models.append(model_name)
            print(f"  ✓ {output_filename}")

        write_init_file(args.output_dir, generated_models)
        print("  ✓ __init__.py")

        print(f"\nGeneration complete! Created {len(generated_models)} models ")
        return 0

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    args = parse_args()
    sys.exit(main(args))
