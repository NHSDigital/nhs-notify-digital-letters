PACKAGE=mesh_poll
VERSION=0.1.0

audit:
	poetry run python -m jake.app ddt -t POETRY -f poetry.lock

install:
	poetry install

install-dev:
	poetry install --with dev

test:
	poetry run pytest

coverage:
	poetry run pytest src/__tests__/ \
		--cov=src \
		--cov-report=html:htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:coverage.xml \
		--cov-branch

lint:
	poetry run pylint mesh_poll

format:
	poetry run autopep8 -ri .

package:
	./package_python_lambda.sh meshpolllambda

clean:
	rm -rf target

.PHONY: install install-dev test coverage lint format package clean
