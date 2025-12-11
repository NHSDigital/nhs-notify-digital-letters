PACKAGE=metric_publishers
VERSION=0.1.0

install:
	pip install -r requirements.txt

install-dev: install
	pip install -r requirements-dev.txt

test:
	cd ../.. && PYTHONPATH=utils/metric-publishers:$$PYTHONPATH pytest utils/metric-publishers/tests/ -v

coverage:
	cd ../.. && PYTHONPATH=utils/metric-publishers:$$PYTHONPATH pytest utils/metric-publishers/tests/ \
		--cov=utils/metric-publishers/metric_publishers \
		--cov-config=utils/metric-publishers/pytest.ini \
		--cov-report=html:utils/metric-publishers/htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:utils/metric-publishers/coverage.xml \
		--cov-branch

lint:
	pylint metric_publishers

format:
	autopep8 -ri .

clean:
	rm -rf target

.PHONY: audit install install-dev test coverage lint format clean
