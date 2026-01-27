.PHONY: install install-dev test coverage clean

install:
	pip install -r requirements.txt

install-dev: install
	pip install -r requirements-dev.txt

test:
	cd ../.. && PYTHONPATH=utils/py-utils:$$PYTHONPATH pytest utils/py-utils/dl_utils/__tests__/ -v

coverage:
	cd ../.. && PYTHONPATH=utils/py-utils:$$PYTHONPATH pytest utils/py-utils/dl_utils/__tests__/ \
		--cov=utils/py-utils/dl_utils \
		--cov-config=utils/py-utils/pytest.ini \
		--cov-report=html:utils/py-utils/htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:utils/py-utils/coverage.xml \
		--cov-branch

clean:
	rm -rf dist/ .coverage htmlcov/ .pytest_cache/ coverage.xml
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete
