PACKAGE=mesh_download
VERSION=0.1.0

audit:
	poetry run python -m jake.app ddt -t POETRY -f poetry.lock

install:
	poetry install

test:
	poetry run pytest

test-coverage:
	poetry run pytest --cov --cov-report xml:target/coverage/@comms/mesh-download-lambda/cobertura-coverage.xml

lint:
	poetry run pylint src

format:
	poetry run autopep8 -ri .

package:
	./package_python_lambda.sh meshdownloadlambda

clean:
	rm -rf target

.PHONY: install install-dev test test-coverage lint format package clean
