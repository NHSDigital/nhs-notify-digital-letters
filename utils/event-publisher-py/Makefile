.PHONY: install test coverage clean build

install:
	poetry install

test:
	poetry run pytest event_publisher/__tests__/ -v

coverage:
	poetry run pytest tests/ --cov=event_publisher --cov-report=html --cov-report=term-missing

clean:
	rm -rf dist/ .coverage htmlcov/ .pytest_cache/
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete

build:
	poetry build
