#!/usr/bin/env python3
"""
YAML to JSON converter for schema files using PyYAML.
"""
import yaml
import json
import sys

def yaml_to_json(yaml_file, json_file):
    """Convert YAML file to JSON file."""
    try:
        with open(yaml_file, 'r') as f:
            data = yaml.safe_load(f)

        with open(json_file, 'w') as f:
            json.dump(data, f, indent=2)

        return True
    except Exception as e:
        print(f"Error converting {yaml_file}: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python yaml_to_json.py <input.yaml> <output.json>")
        sys.exit(1)

    yaml_file = sys.argv[1]
    json_file = sys.argv[2]

    if yaml_to_json(yaml_file, json_file):
        print(f"Converted {yaml_file} to {json_file}")
    else:
        print(f"Failed to convert {yaml_file}")
        sys.exit(1)
