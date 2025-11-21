SHELL := /bin/bash
# Makefile for AsyncAPI to EventCatalog Importer
#
# Common tasks for running the importer, testing, and maintenance

.DEFAULT_GOAL := help

# Configuration (can be overridden with environment variables)
PYTHON := python3
PIP := pip
ASYNCAPI_DIR ?= ../asyncapigenerator/output
EVENTCATALOG_DIR ?= ../eventcatalog
PARENT_DOMAIN_NAME ?= Digital Letters
DOMAIN_NAME ?= $(PARENT_DOMAIN_NAME)
SCHEMA_BASE_PATH ?= ../../
VERBOSE ?= false

# Colors for output
COLOR_RESET := \033[0m
COLOR_BOLD := \033[1m
COLOR_GREEN := \033[32m
COLOR_YELLOW := \033[33m
COLOR_BLUE := \033[34m

##@ General

.PHONY: help
help: ## Display this help message
	@echo "$(COLOR_BOLD)AsyncAPI to EventCatalog Importer$(COLOR_RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(COLOR_BLUE)<target>$(COLOR_RESET)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(COLOR_BLUE)%-20s$(COLOR_RESET) %s\n", $$1, $$2 } /^##@/ { printf "\n$(COLOR_BOLD)%s$(COLOR_RESET)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Installation

.PHONY: install
install: ## Install Python dependencies
	@echo "$(COLOR_GREEN)Installing dependencies...$(COLOR_RESET)"
	$(PIP) install -r requirements.txt
	@echo "$(COLOR_GREEN)✓ Dependencies installed$(COLOR_RESET)"

.PHONY: install-dev
install-dev: install ## Install development dependencies
	@echo "$(COLOR_GREEN)Installing development dependencies...$(COLOR_RESET)"
	$(PIP) install -r requirements-dev.txt
	@echo "$(COLOR_GREEN)✓ Development dependencies installed$(COLOR_RESET)"

##@ Import Operations

.PHONY: import
import: clean-output ## Run the importer with default settings
	@echo "$(COLOR_GREEN)Running AsyncAPI importer...$(COLOR_RESET)"
	$(PYTHON) import_asyncapi.py \
		--asyncapi-dir "$(ASYNCAPI_DIR)" \
		--eventcatalog-dir "$(EVENTCATALOG_DIR)" \
		--parent-domain "$(PARENT_DOMAIN_NAME)" \
		--schema-base-path "$(SCHEMA_BASE_PATH)"
	@echo "$(COLOR_GREEN)✓ Import completed$(COLOR_RESET)"

.PHONY: import-verbose
import-verbose: ## Run the importer with verbose output
	@echo "$(COLOR_GREEN)Running AsyncAPI importer (verbose)...$(COLOR_RESET)"
	$(PYTHON) import_asyncapi.py \
		--asyncapi-dir "$(ASYNCAPI_DIR)" \
		--eventcatalog-dir "$(EVENTCATALOG_DIR)" \
		--parent-domain "$(PARENT_DOMAIN_NAME)" \
		--schema-base-path "$(SCHEMA_BASE_PATH)" \
		--verbose
	@echo "$(COLOR_GREEN)✓ Import completed$(COLOR_RESET)"

.PHONY: import-custom
import-custom: ## Run with custom paths (use: make import-custom ASYNCAPI_DIR=/path EVENTCATALOG_DIR=/path)
	@echo "$(COLOR_GREEN)Running AsyncAPI importer with custom paths...$(COLOR_RESET)"
	@echo "  AsyncAPI dir: $(ASYNCAPI_DIR)"
	@echo "  EventCatalog dir: $(EVENTCATALOG_DIR)"
	@echo "  Parent Domain: $(PARENT_DOMAIN_NAME)"
	@echo "  Schema base path: $(SCHEMA_BASE_PATH)"
	$(PYTHON) import_asyncapi.py \
		--asyncapi-dir "$(ASYNCAPI_DIR)" \
		--eventcatalog-dir "$(EVENTCATALOG_DIR)" \
		--parent-domain "$(PARENT_DOMAIN_NAME)" \
		--schema-base-path "$(SCHEMA_BASE_PATH)" \
		--verbose
	@echo "$(COLOR_GREEN)✓ Import completed$(COLOR_RESET)"

.PHONY: dry-run
dry-run: ## Show what would be imported (lists AsyncAPI files)
	@echo "$(COLOR_YELLOW)AsyncAPI files to be processed:$(COLOR_RESET)"
	@ls -1 $(ASYNCAPI_DIR)/asyncapi-*.yaml 2>/dev/null || echo "No AsyncAPI files found in $(ASYNCAPI_DIR)"

##@ Testing

.PHONY: test
test: ## Run unit tests
	@echo "$(COLOR_GREEN)Running tests...$(COLOR_RESET)"
	cd ../.. && $(PYTHON) -m pytest src/eventcatalogasyncapiimporter/tests -v

.PHONY: coverage
coverage: ## Run tests with coverage report
	@echo "$(COLOR_GREEN)Running tests with coverage...$(COLOR_RESET)"
	./test.sh $(PYTHON)

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	@echo "$(COLOR_GREEN)Running tests in watch mode...$(COLOR_RESET)"
	cd ../.. && $(PYTHON) -m pytest src/eventcatalogasyncapiimporter/tests --watch

.PHONY: test-quick
test-quick: ## Run tests without verbose output
	@echo "$(COLOR_GREEN)Running tests...$(COLOR_RESET)"
	$(PYTHON) -m unittest test_import_asyncapi.py

##@ Development

.PHONY: examples
examples: ## Run examples script
	@echo "$(COLOR_GREEN)Running examples...$(COLOR_RESET)"
	$(PYTHON) examples.py

.PHONY: lint
lint: ## Run linting checks
	@echo "$(COLOR_GREEN)Running linter...$(COLOR_RESET)"
	$(PYTHON) -m pylint import_asyncapi.py --exit-zero

.PHONY: format
format: ## Format Python code with black
	@echo "$(COLOR_GREEN)Formatting code...$(COLOR_RESET)"
	$(PYTHON) -m black import_asyncapi.py test_import_asyncapi.py examples.py

.PHONY: check
check: lint test ## Run linting and tests

##@ Cleanup

.PHONY: clean
clean: ## Clean Python cache files
	@echo "$(COLOR_GREEN)Cleaning Python cache files...$(COLOR_RESET)"
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete 2>/dev/null || true
	@echo "$(COLOR_GREEN)✓ Cleanup completed$(COLOR_RESET)"

.PHONY: clean-output
clean-output: ## Clean generated EventCatalog files (USE WITH CAUTION)
	@echo "$(COLOR_YELLOW)⚠️  This will remove generated domains and channels!$(COLOR_RESET)"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	@echo "$(COLOR_GREEN)Cleaning EventCatalog output...$(COLOR_RESET)"
	rm -rf $(EVENTCATALOG_DIR)/domains/*
	rm -rf $(EVENTCATALOG_DIR)/channels/*
	@echo "$(COLOR_GREEN)✓ Output cleaned$(COLOR_RESET)"

##@ Information

.PHONY: info
info: ## Show configuration information
	@echo "$(COLOR_BOLD)Configuration:$(COLOR_RESET)"
	@echo "  Python: $(shell $(PYTHON) --version)"
	@echo "  Pip: $(shell $(PIP) --version | cut -d' ' -f1-2)"
	@echo "  AsyncAPI dir: $(ASYNCAPI_DIR)"
	@echo "  EventCatalog dir: $(EVENTCATALOG_DIR)"
	@echo "  Domain name: $(DOMAIN_NAME)"
	@echo "  Schema base path: $(SCHEMA_BASE_PATH)"
	@echo "  Verbose: $(VERBOSE)"
	@echo ""
	@echo "$(COLOR_BOLD)AsyncAPI Files:$(COLOR_RESET)"
	@ls -1 $(ASYNCAPI_DIR)/asyncapi-*.yaml 2>/dev/null | wc -l | xargs -I {} echo "  Found {} file(s)"
	@echo ""
	@echo "$(COLOR_BOLD)Dependencies:$(COLOR_RESET)"
	@$(PIP) list 2>/dev/null | grep -i pyyaml || echo "  PyYAML: Not installed (run 'make install')"

.PHONY: version
version: ## Show tool version information
	@echo "AsyncAPI to EventCatalog Importer"
	@echo "Part of NHS Notify Digital Letters"
	@$(PYTHON) import_asyncapi.py --help | head -n 3

##@ Quick Commands

.PHONY: quick-import
quick-import: install import ## Install dependencies and run import (one command)
	@echo "$(COLOR_GREEN)✓ Quick import completed!$(COLOR_RESET)"

.PHONY: full-check
full-check: install-dev lint test ## Install dev deps, lint, and test
	@echo "$(COLOR_GREEN)✓ Full check completed!$(COLOR_RESET)"

.PHONY: setup
setup: install ## Initial setup (install dependencies)
	@echo "$(COLOR_GREEN)✓ Setup completed!$(COLOR_RESET)"
	@echo ""
	@echo "$(COLOR_BOLD)Next steps:$(COLOR_RESET)"
	@echo "  1. Run 'make import' to import AsyncAPI files"
	@echo "  2. Or run 'make import-verbose' for detailed output"
	@echo "  3. View results in EventCatalog"

##@ Documentation

.PHONY: docs
docs: ## Open documentation files
	@echo "$(COLOR_BOLD)Documentation files:$(COLOR_RESET)"
	@echo "  - README.md: Complete reference"
	@echo "  - QUICKSTART.md: Getting started guide"
	@echo "  - OVERVIEW.md: High-level summary"
	@echo "  - CHECKLIST.md: Step-by-step checklist"
	@echo "  - PROJECT_SUMMARY.md: Detailed project info"

.PHONY: readme
readme: ## Display quick reference from README
	@head -n 50 README.md

##@ Convenience Targets

.PHONY: all
all: setup test import ## Setup, test, and import (full workflow)
	@echo "$(COLOR_GREEN)✓ All tasks completed!$(COLOR_RESET)"

.PHONY: ci
ci: install test ## CI/CD target (install and test)
	@echo "$(COLOR_GREEN)✓ CI tasks completed!$(COLOR_RESET)"
