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
	cd ../.. && COVERAGE_RCFILE=utils/metric-publishers/pyproject.toml \
		poetry -C utils/metric-publishers run pytest utils/metric-publishers/tests/ \
		--cov=utils/metric-publishers/metric_publishers \
		--cov-report=html:utils/metric-publishers/htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:utils/metric-publishers/coverage.xml \
		--cov-branch

lint:
	poetry run pylint metric_publishers

format:
	poetry run autopep8 -ri .

clean:
	rm -rf target

.PHONY: audit install install-dev test coverage lint format clean
