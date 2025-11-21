PACKAGE=py_mock_mesh
VERSION=1.0.0

audit:
	poetry run python -m jake.app ddt -t POETRY -f poetry.lock

install:
	poetry install

test:
	poetry run pytest || echo

test-coverage:
	poetry run pytest --cov --cov-report xml:target/coverage/@comms/py-mock-mesh/cobertura-coverage.xml || echo

lint:
	poetry run pylint py_mock_mesh

format:
	poetry run autopep8 -ri .

clean:
	rm -rf target

.PHONY: audit install test test-coverage lint format clean
