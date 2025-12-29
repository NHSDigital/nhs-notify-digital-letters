PACKAGE=mesh_download
VERSION=0.1.0

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements-dev.txt

test:
	cd ../.. && PYTHONPATH=lambdas/mesh-download:$$PYTHONPATH pytest lambdas/mesh-download/src/__tests__/ -v

coverage:
	cd ../.. && PYTHONPATH=lambdas/mesh-download:$$PYTHONPATH pytest lambdas/mesh-download/src/__tests__/ \
		--cov=lambdas/mesh-download/src \
		--cov-config=lambdas/mesh-download/pytest.ini \
		--cov-report=html:lambdas/mesh-download/htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:lambdas/mesh-download/coverage.xml \
		--cov-branch

lint:
	pylint src

format:
	autopep8 -ri .

package:
	./package_python_lambda.sh meshdownloadlambda

clean:
	rm -rf target

.PHONY: install install-dev test coverage lint format package clean
