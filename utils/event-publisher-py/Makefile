.PHONY: install install-dev test coverage clean build

install:
	poetry install

install-dev:
	poetry install --with dev

test:
	poetry run pytest event_publisher/__tests__/ -v

coverage:
	poetry run pytest event_publisher/__tests__/ \
		--cov=event_publisher \
		--cov-report=html:htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:coverage.xml \
		--cov-branch

clean:
	rm -rf dist/ .coverage htmlcov/ .pytest_cache/ coverage.xml
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete

build:
	poetry build
