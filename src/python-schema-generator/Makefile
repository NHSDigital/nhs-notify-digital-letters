# Variables
SCHEMA_SRC_DIR := ../../schemas/digital-letters/2025-10-draft/events
OUTPUT_DIR := ../digital-letters-events/digital_letters_events/models
SRC_DIR := src
SCHEMAS_DIR := $(SRC_DIR)/schemas

# Default target
.PHONY: all clean generate install install-dev test coverage help

all: generate

# Install production dependencies
install:
	@echo "Installing Python production dependencies..."
	@pip install -r requirements.txt
	@echo "Production dependencies installed!"
	@echo "Installing Node production dependencies..."
	@npm install
	@echo "Node production dependencies installed!"

# Install development dependencies
install-dev:
	@echo "Installing development dependencies..."
	@pip install -r requirements-dev.txt
	@echo "Development dependencies installed!"

# Generate Pydantic models from JSON schemas
generate: install
	@echo "Generating Pydantic models from JSON schemas..."
	@mkdir -p $(OUTPUT_DIR)
	@npm run merge
	@python $(SRC_DIR)/generate_models.py \
		--input-dir $(SCHEMAS_DIR) \
		--output-dir $(OUTPUT_DIR)
	@echo "Pydantic models generated in $(OUTPUT_DIR)/"

# Run tests
test: install-dev
	@echo "Running tests..."
	@pytest tests/

# Generate coverage report
coverage: install-dev
	@echo "Generating coverage report..."
	@pytest tests/ \
		--cov=. \
		--cov-config=pytest.ini \
		--cov-report=html:htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:coverage.xml \
		--cov-branch
	@echo "Coverage report generated in htmlcov/"

# Clean output directory and generated files
clean:
	@echo "Cleaning generated models..."
	@rm -rf $(OUTPUT_DIR) htmlcov .pytest_cache coverage.xml
	@rm -rf $(SCHEMAS_DIR)
	@echo "Clean complete!"

# Show help
help:
	@echo "Available targets:"
	@echo "  all          - Generate Pydantic models (default)"
	@echo "  install      - Install production dependencies"
	@echo "  install-dev  - Install development dependencies"
	@echo "  generate     - Generate Pydantic models from JSON schemas"
	@echo "  test         - Run tests"
	@echo "  coverage     - Generate coverage report"
	@echo "  clean        - Clean output directories"
	@echo "  help         - Show this help message"
