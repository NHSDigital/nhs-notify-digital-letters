PACKAGE=metric_publishers
VERSION=1.0.0

audit:
	poetry run python -m jake.app ddt -t POETRY -f poetry.lock

install:
	poetry install

install-dev:
	poetry install --with dev

test:
	poetry run pytest || echo

coverage:
	poetry run pytest tests/ \
		--cov=metric_publishers \
		--cov-report=html:htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:coverage.xml \
		--cov-branch

lint:
	poetry run pylint metric_publishers

format:
	poetry run autopep8 -ri .

clean:
	rm -rf target

.PHONY: audit install install-dev test coverage lint format clean
