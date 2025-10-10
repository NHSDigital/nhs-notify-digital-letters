#!/usr/bin/env python3
"""
Combined schema documentation generator.
Runs both YAML and Markdown generation in sequence.
"""
import os
import sys
import subprocess
import shutil
from pathlib import Path


def run_documentation_generation(src_dir, output_dir):
    """Run both YAML and Markdown documentation generation."""
    script_dir = Path(__file__).parent
    output_path = Path(output_dir)

    # Create the nested directory structure
    docs_yaml_dir = output_path / "docs" / "yaml"
    docs_md_dir = output_path / "docs" / "md"
    schemas_dir = output_path / "schemas"

    # Get the Python executable path for this environment
    python_executable = sys.executable

    print("=== Schema Documentation Generation ===")
    print(f"Source directory: {src_dir}")
    print(f"Output directory: {output_dir}")
    print(f"YAML docs directory: {docs_yaml_dir}")
    print(f"Markdown docs directory: {docs_md_dir}")
    print(f"Schemas directory: {schemas_dir}")
    print()

    # Step 1: Convert YAML schemas to JSON in schemas directory
    print("Step 1: Converting YAML schemas to JSON...")
    try:
        import subprocess

        # Find all YAML schema files
        src_path = Path(src_dir)
        yaml_files = list(src_path.rglob("*.schema.yaml"))

        if not yaml_files:
            print(f"No YAML schema files found in {src_dir}")
            return False

        # Ensure schemas directory exists
        schemas_dir.mkdir(parents=True, exist_ok=True)

        # Convert each YAML file to JSON
        script_dir = Path(__file__).parent
        yaml_to_json_script = script_dir / "yaml_to_json.py"

        for yaml_file in yaml_files:
            rel_path = yaml_file.relative_to(src_path)
            # Remove .schema.yaml and add .schema.json
            json_file = schemas_dir / str(rel_path).replace('.schema.yaml', '.schema.json')
            json_file = Path(json_file)
            json_file.parent.mkdir(parents=True, exist_ok=True)

            # Run the YAML to JSON conversion
            cmd = [python_executable, str(yaml_to_json_script), str(yaml_file), str(json_file)]
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                print(f"Error converting {yaml_file}: {result.stderr}")
                return False

            print(f"Converted: {yaml_file} → {json_file}")

        print(f"Converted {len(yaml_files)} schema files to JSON in: {schemas_dir}")

    except Exception as e:
        print(f"Error converting schema files: {e}")
        return False

    print()

    # Step 2: Generate YAML documentation
    print("Step 2: Generating YAML documentation...")
    yaml_script = script_dir / "generate_docs_yaml.py"
    yaml_cmd = [python_executable, str(yaml_script), src_dir, str(docs_yaml_dir)]

    try:
        result = subprocess.run(yaml_cmd, check=True, capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("YAML generation warnings/errors:")
            print(result.stderr)
    except subprocess.CalledProcessError as e:
        print(f"Error generating YAML documentation: {e}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False

    print()

    # Step 3: Generate Markdown documentation
    print("Step 3: Generating Markdown documentation...")
    md_script = script_dir / "generate_docs_markdown.py"
    md_cmd = [python_executable, str(md_script), str(docs_yaml_dir), str(docs_md_dir)]

    try:
        result = subprocess.run(md_cmd, check=True, capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("Markdown generation warnings/errors:")
            print(result.stderr)
    except subprocess.CalledProcessError as e:
        print(f"Error generating Markdown documentation: {e}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False

    print()
    print("=== Documentation Generation Complete ===")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        print("Usage: python generate_docs_all.py <src_dir> [output_dir]")
        print()
        print("Arguments:")
        print("  src_dir      : Directory containing .schema.yaml files")
        print("  output_dir   : Base output directory (default: output)")
        print()
        print("Output structure:")
        print("  output/")
        print("    docs/")
        print("      yaml/     # YAML documentation files")
        print("      md/       # Markdown documentation files")
        print("    schemas/    # Copy of source schema files")
        print()
        print("Examples:")
        print("  python generate_docs_all.py src")
        print("  python generate_docs_all.py src my_output")
        sys.exit(1)

    src_dir = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "output"

    if not os.path.exists(src_dir):
        print(f"Source directory does not exist: {src_dir}")
        sys.exit(1)

    success = run_documentation_generation(src_dir, output_dir)
    sys.exit(0 if success else 1)
