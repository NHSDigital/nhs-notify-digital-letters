# Schema Scripts

This directory contains utility scripts for schema processing and documentation generation.

## Documentation Generation Scripts

The documentation generation has been split into a two-stage process for better flexibility and tool integration:

### 1. `generate_docs_yaml.py`

Generates structured YAML documentation files from JSON Schema YAML files.

```bash
python generate_docs_yaml.py <src_dir> <docs_yaml_dir>
```

**Features:**

- Extracts metadata, properties, constraints, examples, and inheritance information
- Creates `.doc.yaml` files with structured documentation data
- Generates hierarchical `index.yaml` files for navigation
- Machine-readable format suitable for consumption by other tools (Jekyll, etc.)

### 2. `generate_docs_markdown.py`

Generates Markdown documentation from YAML documentation files.

```bash
python generate_docs_markdown.py <docs_yaml_dir> <docs_md_dir>
```

**Features:**

- Converts YAML documentation to human-readable Markdown
- Creates hierarchical index files with navigation
- Preserves all schema information in readable format
- Generates front matter for Jekyll/static site generators
- **Embeds source YAML schema in front matter** for tool consumption
- Supports nested properties and complex schema structures

### 3. `generate_docs_all.py`

Combined script that runs both generators in sequence and copies source schemas.

```bash
python generate_docs_all.py <src_dir> [output_dir]
```

**Features:**

- Copies source schema files to `output/schemas/`
- Generates YAML documentation in `output/docs/yaml/`
- Generates Markdown documentation in `output/docs/md/`
- Creates a complete, self-contained documentation package

**Default directories:**

- `output_dir` defaults to `output`

### 4. `generate_docs.py` (Legacy)

Original single-stage documentation generator. Still available but recommend using the new two-stage approach.

## Other Utility Scripts

- `yaml_to_json.py` - Converts YAML schema files to JSON format using PyYAML

## Documentation File Structure

```text
output/                        # Complete documentation package
├── docs/
│   ├── yaml/                  # Generated YAML documentation
│   │   ├── index.yaml         # Root index
│   │   └── 2025-10/
│   │       ├── index.yaml     # Directory index
│   │       └── *.schema.doc.yaml
│   └── md/                    # Generated Markdown documentation
│       ├── index.md           # Root index
│       └── 2025-10/
│           ├── index.md       # Directory index
│           └── *.schema.doc.md
└── schemas/                   # Copy of source schema files
    └── 2025-10/
        └── *.schema.yaml
```

## Benefits of Two-Stage Approach

1. **Flexibility**: YAML files can be consumed by different tools (Jekyll themes, API generators, etc.)
2. **Separation of Concerns**: Documentation extraction separate from presentation
3. **Caching**: YAML generation only needs to run when schemas change
4. **Multiple Outputs**: Same YAML can generate different formats (Markdown, HTML, PDF, etc.)
5. **Tool Integration**: Other applications can easily consume the structured YAML data
6. **Source Preservation**: Original YAML schema embedded in Markdown front matter for tool access

## Markdown Front Matter Structure

The generated Markdown files include rich front matter with all structured documentation properties:

```yaml
---
title: "Schema Title"
description: "Schema description"
schema_id: "https://example.com/schema.json"
schema_version: "https://json-schema.org/draft/2020-12/schema"
generated: "2025-10-09T10:46:53.752400"
source_file: "path/to/schema.yaml"
properties:
  property_name:
    type: string
    description: Property description
    format: uuid
    examples: []
required_fields:
  - required_property
inheritance:
  - reference: https://example.com/base-schema.json
    schema:
      $ref: https://example.com/base-schema.json
additional_properties:
  allowed: true
type: object
constraints:
  minLength: 1
examples:
  - example_value
---
```

This allows tools like Jekyll to:

- Access all metadata for listing and organization
- Process properties directly for form generation or validation
- Use inheritance information for schema relationships
- Generate dynamic content from structured schema data

## Usage Examples

### Generate everything with defaults

```bash
python generate_docs_all.py src
```

### Generate with custom output directory

```bash
python generate_docs_all.py src my_output
```

### Generate only YAML (for tool consumption)

```bash
python generate_docs_yaml.py src docs_yaml
```

### Generate only Markdown (from existing YAML)

```bash
python generate_docs_markdown.py docs_yaml docs_md
```

### Legacy single-stage generation

```bash
python generate_docs.py src docs
```

### Convert YAML to JSON

```bash
python yaml_to_json.py input.schema.yaml output.schema.json
```

## Requirements

- Python 3.7+
- PyYAML (`pip install pyyaml`)

## Dependencies

- Python 3.x
- PyYAML (automatically installed via `make config`)
