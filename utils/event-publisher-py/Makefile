.PHONY: install install-dev test coverage clean build

install:
	poetry install

install-dev:
	poetry install --with dev

test:
	poetry run pytest event_publisher/__tests__/ -v

coverage:
	@cd ../.. && poetry -C utils/event-publisher-py run pytest utils/event-publisher-py/event_publisher/__tests__/ \
		--cov=utils/event-publisher-py/event_publisher \
		--cov-config=utils/event-publisher-py/pyproject.toml \
		--cov-report=html:utils/event-publisher-py/htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:utils/event-publisher-py/coverage.xml \
		--cov-branch

clean:
	rm -rf dist/ .coverage htmlcov/ .pytest_cache/ coverage.xml
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete

build:
	poetry build
