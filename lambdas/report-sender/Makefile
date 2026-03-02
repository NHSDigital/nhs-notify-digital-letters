PACKAGE=report_sender
VERSION=0.1.0

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements-dev.txt

test:
	cd ../.. && PYTHONPATH=lambdas/report-sender:$$PYTHONPATH pytest lambdas/report-sender/report_sender/__tests__/ -v

coverage:
	cd ../.. && PYTHONPATH=lambdas/report-sender:$$PYTHONPATH pytest lambdas/report-sender/report_sender/__tests__/ \
		--cov=lambdas/report-sender/report_sender \
		--cov-config=lambdas/report-sender/pytest.ini \
		--cov-report=html:lambdas/report-sender/htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:lambdas/report-sender/coverage.xml \
		--cov-branch

lint:
	pylint report_sender

format:
	autopep8 -ri .

package:
	./package_python_lambda.sh report_sender

clean:
	rm -rf target

.PHONY: install install-dev test coverage lint format package clean
