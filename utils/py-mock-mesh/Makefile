PACKAGE=py_mock_mesh
VERSION=1.0.0

audit:
	cd ../.. && python -m jake.app ddt -t POETRY -f utils/py-mock-mesh/poetry.lock

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
