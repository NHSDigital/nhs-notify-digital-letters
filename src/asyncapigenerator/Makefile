.PHONY: help install install-dev generate generate-service clean test test-verbose coverage lint format clean-test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install production dependencies
	pip install -r requirements.txt

install-dev: install ## Install development dependencies
	pip install -r requirements-dev.txt

generate: clean## Generate AsyncAPI specs for all services
	python generate_asyncapi.py --config config.yaml

generate-service: ## Generate AsyncAPI for a specific service (use SERVICE=name)
	@if [ -z "$(SERVICE)" ]; then \
		echo "Error: SERVICE not specified. Usage: make generate-service SERVICE='MESH Services'"; \
		exit 1; \
	fi
	python generate_asyncapi.py --config config.yaml --service "$(SERVICE)"

clean: ## Remove generated output files
	rm -rf output/

test: ## Run unit tests
	pytest tests/ -v

test-verbose: ## Run tests with verbose output
	pytest tests/ -vv -s

coverage: ## Run tests with coverage report
	cd ../.. && pytest src/asyncapigenerator/tests/ --cov=src/asyncapigenerator --cov-config=src/asyncapigenerator/pytest.ini --cov-report=html:src/asyncapigenerator/htmlcov --cov-report=term-missing --cov-report=xml:src/asyncapigenerator/coverage.xml

lint: ## Run linting
	flake8 .
	mypy .

format: ## Format code with black
	black .

clean-test: ## Clean test artifacts
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage
	rm -rf coverage.xml
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

validate: ## Validate generated AsyncAPI specs (requires asyncapi CLI)
	@echo "Validating AsyncAPI specifications..."
	@for file in output/*.yaml; do \
		echo "Validating $$file..."; \
		asyncapi validate $$file || echo "Note: Install AsyncAPI CLI with 'npm install -g @asyncapi/cli' for validation"; \
	done
