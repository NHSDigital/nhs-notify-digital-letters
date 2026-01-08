PACKAGE=py_mock_mesh
VERSION=0.1.0

install:
	pip install -r requirements.txt

install-dev: install
	pip install -r requirements-dev.txt

test:
	@echo "No tests for py-mock-mesh"

test-coverage:
	@echo "No tests for py-mock-mesh"

lint:
	pylint py_mock_mesh

format:
	autopep8 -ri .

clean:
	rm -rf target

.PHONY: audit install install-dev test test-coverage lint format clean
