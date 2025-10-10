# Variables
SCHEMA_SRC_DIR := src
OUTPUT_DIR := output
DOCS_OUTPUT_DIR := $(OUTPUT_DIR)/docs
SCHEMAS_OUTPUT_DIR := $(OUTPUT_DIR)/schemas
SCRIPTS_DIR := scripts
YAML_TO_JSON_SCRIPT := $(SCRIPTS_DIR)/yaml_to_json.py
GENERATE_DOCS_SCRIPT := $(SCRIPTS_DIR)/generate_docs.py
GENERATE_DOCS_ALL_SCRIPT := $(SCRIPTS_DIR)/generate_docs_all.py
GENERATE_DOCS_YAML_SCRIPT := $(SCRIPTS_DIR)/generate_docs_yaml.py
GENERATE_DOCS_MD_SCRIPT := $(SCRIPTS_DIR)/generate_docs_markdown.py
YAML_SCHEMAS := $(shell find $(SCHEMA_SRC_DIR) -name "*.schema.yaml" -type f)
JSON_OUTPUTS := $(patsubst $(SCHEMA_SRC_DIR)/%.schema.yaml,$(OUTPUT_DIR)/%.schema.json,$(YAML_SCHEMAS))

# Default target
.PHONY: all clean build build-schemas convert-schemas config check-deps build-docs build-docs-yaml build-docs-md build-docs-legacy

all: build

# Create output directory
$(OUTPUT_DIR):
	@mkdir -p $(OUTPUT_DIR)

# Setup dependencies
config:
	@echo "Setting up dependencies for YAML to JSON conversion..."
	@echo "Checking Python installation..."
	@python3 --version || (echo "Error: Python 3 is required" && exit 1)
	@echo "Checking PyYAML installation..."
	@python3 -c "import yaml; print('PyYAML is already installed')" 2>/dev/null || \
		(echo "Installing PyYAML..." && pip install PyYAML)
	@echo "Dependencies setup complete!"

# Check dependencies before building
check-deps:
	@python3 -c "import yaml" 2>/dev/null || \
		(echo "PyYAML not found. Run 'make config' to install dependencies." && exit 1)

# Convert all YAML schemas to JSON (standalone - puts JSON files in schemas subdirectory)
convert-schemas: check-deps $(OUTPUT_DIR)
	@echo "Converting YAML schemas to JSON..."
	@mkdir -p "$(SCHEMAS_OUTPUT_DIR)"
	@for yaml_file in $(YAML_SCHEMAS); do \
		relative_path=$${yaml_file#$(SCHEMA_SRC_DIR)/}; \
		output_file="$(SCHEMAS_OUTPUT_DIR)/$${relative_path%.schema.yaml}.schema.json"; \
		output_dir=$$(dirname "$$output_file"); \
		mkdir -p "$$output_dir"; \
		echo "Converting $$yaml_file to $$output_file"; \
		python3 $(YAML_TO_JSON_SCRIPT) "$$yaml_file" "$$output_file"; \
	done

# Build all schemas (standalone - just JSON conversion)
build-schemas: convert-schemas
	@echo "Building schemas complete!"
	@echo "Found $(words $(YAML_SCHEMAS)) YAML schema(s):"
	@for schema in $(YAML_SCHEMAS); do echo "  - $$schema"; done
	@echo "Generated JSON schemas in $(SCHEMAS_OUTPUT_DIR)/"

# Build everything (schemas and docs)
build: build-docs
	@echo "Build complete! Generated JSON schemas and documentation in $(OUTPUT_DIR)/"

# Generate documentation from schemas (new two-stage approach)
# This now includes JSON schema conversion as part of the documentation package
build-docs: check-deps
	@echo "Generating complete documentation package from YAML schemas..."
	@python3 $(GENERATE_DOCS_ALL_SCRIPT) $(SCHEMA_SRC_DIR) $(OUTPUT_DIR)
	@echo "Documentation package generated in $(OUTPUT_DIR)/"
	@echo "  - JSON Schemas: $(SCHEMAS_OUTPUT_DIR)/"
	@echo "  - YAML docs: $(DOCS_OUTPUT_DIR)/yaml/"
	@echo "  - Markdown docs: $(DOCS_OUTPUT_DIR)/md/"

# Generate only YAML documentation (for tool consumption)
build-docs-yaml: check-deps
	@echo "Generating YAML documentation from schemas..."
	@python3 $(GENERATE_DOCS_YAML_SCRIPT) $(SCHEMA_SRC_DIR) $(DOCS_OUTPUT_DIR)/yaml
	@echo "YAML documentation generated in $(DOCS_OUTPUT_DIR)/yaml/"

# Generate only Markdown documentation (from existing YAML docs)
build-docs-md: check-deps
	@echo "Generating Markdown documentation from YAML docs..."
	@test -d "$(DOCS_OUTPUT_DIR)/yaml" || (echo "Error: YAML docs not found. Run 'make build-docs-yaml' first." && exit 1)
	@python3 $(GENERATE_DOCS_MD_SCRIPT) $(DOCS_OUTPUT_DIR)/yaml $(DOCS_OUTPUT_DIR)/md
	@echo "Markdown documentation generated in $(DOCS_OUTPUT_DIR)/md/"

# Generate documentation using legacy single-stage approach
build-docs-legacy: check-deps
	@echo "Generating documentation using legacy approach..."
	@python3 $(GENERATE_DOCS_SCRIPT) $(SCHEMA_SRC_DIR) docs_legacy
	@echo "Legacy documentation generated in docs_legacy/"

# Clean output directory
clean:
	@echo "Cleaning output directories..."
	@rm -rf $(OUTPUT_DIR) docs_legacy
	@echo "Clean complete!"

# Show help
help:
	@echo "Available targets:"
	@echo "  all               - Build everything (complete documentation package) (default)"
	@echo "  build             - Build everything (complete documentation package)"
	@echo "  build-schemas     - Convert YAML schemas to JSON only (in output/schemas/)"
	@echo "  build-docs        - Generate complete documentation package (JSON + YAML + Markdown docs)"
	@echo "  build-docs-yaml   - Generate only YAML documentation (for tool consumption)"
	@echo "  build-docs-md     - Generate only Markdown documentation (requires YAML docs)"
	@echo "  build-docs-legacy - Generate documentation using legacy single-stage approach"
	@echo "  config            - Setup dependencies (Python, PyYAML)"
	@echo "  list              - List all YAML schema files that would be processed"
	@echo "  clean             - Remove output directories"
	@echo "  help              - Show this help message"
	@echo ""
	@echo "Source schemas are looked for in: $(SCHEMA_SRC_DIR)/"
	@echo "Output structure:"
	@echo "  $(OUTPUT_DIR)/"
	@echo "    ├── docs/"
	@echo "    │   ├── yaml/     # YAML documentation files"
	@echo "    │   └── md/       # Markdown documentation files"
	@echo "    └── schemas/      # JSON schema files (converted from YAML)"

# List all YAML schema files
list:
	@echo "YAML schema files found:"
	@for schema in $(YAML_SCHEMAS); do echo "  - $$schema"; done
	@echo "Total: $(words $(YAML_SCHEMAS)) file(s)"
