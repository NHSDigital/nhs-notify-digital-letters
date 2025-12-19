.PHONY: install install-dev test coverage clean

install:
	pip install -r requirements.txt

install-dev: install
	pip install -r requirements-dev.txt

test:
	cd ../.. && PYTHONPATH=utils/event-publisher-py:$$PYTHONPATH pytest utils/event-publisher-py/event_publisher/__tests__/ -v

coverage:
	cd ../.. && PYTHONPATH=utils/event-publisher-py:$$PYTHONPATH pytest utils/event-publisher-py/event_publisher/__tests__/ \
		--cov=utils/event-publisher-py/event_publisher \
		--cov-config=utils/event-publisher-py/pytest.ini \
		--cov-report=html:utils/event-publisher-py/htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:utils/event-publisher-py/coverage.xml \
		--cov-branch

clean:
	rm -rf dist/ .coverage htmlcov/ .pytest_cache/ coverage.xml
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete
