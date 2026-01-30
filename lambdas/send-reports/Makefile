PACKAGE=send_reports
VERSION=0.1.0

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements-dev.txt

test:
	cd ../.. && PYTHONPATH=lambdas/send-reports:$$PYTHONPATH pytest lambdas/send-reports/send_reports/__tests__/ -v

coverage:
	cd ../.. && PYTHONPATH=lambdas/send-reports:$$PYTHONPATH pytest lambdas/send-reports/send_reports/__tests__/ \
		--cov=lambdas/send-reports/send_reports \
		--cov-config=lambdas/send-reports/pytest.ini \
		--cov-report=html:lambdas/send-reports/htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:lambdas/send-reports/coverage.xml \
		--cov-branch

lint:
	pylint send_reports

format:
	autopep8 -ri .

package:
	./package_python_lambda.sh send_reports

clean:
	rm -rf target

.PHONY: install install-dev test coverage lint format package clean
