.PHONY: install install-dev test coverage clean

install:
	pip install -r requirements.txt

install-dev: install
	pip install -r requirements-dev.txt

test:
	cd ../.. && PYTHONPATH=utils/sender-management:$$PYTHONPATH pytest utils/sender-management/sender_management/__tests__/ -v

coverage:
	cd ../.. && PYTHONPATH=utils/sender-management:$$PYTHONPATH pytest utils/sender-management/sender_management/__tests__/ \
		--cov=utils/sender-management/sender_management \
		--cov-config=utils/sender-management/pytest.ini \
		--cov-report=html:utils/sender-management/htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:utils/sender-management/coverage.xml \
		--cov-branch

lint:
	pylint sender_management

format:
	autopep8 -ri .

clean:
	rm -rf .coverage htmlcov/ .pytest_cache/ coverage.xml
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete
