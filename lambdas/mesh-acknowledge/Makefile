PACKAGE=mesh_acknowledge
VERSION=0.1.0

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements-dev.txt

test:
	cd ../.. && PYTHONPATH=lambdas/mesh-acknowledge:$$PYTHONPATH pytest lambdas/mesh-acknowledge/mesh_acknowledge/__tests__/ -v

coverage:
	cd ../.. && PYTHONPATH=lambdas/mesh-acknowledge:$$PYTHONPATH pytest lambdas/mesh-acknowledge/mesh_acknowledge/__tests__/ \
		--cov=lambdas/mesh-acknowledge/mesh_acknowledge \
		--cov-config=lambdas/mesh-acknowledge/pytest.ini \
		--cov-report=html:lambdas/mesh-acknowledge/htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:lambdas/mesh-acknowledge/coverage.xml \
		--cov-branch

lint:
	pylint mesh_acknowledge

format:
	autopep8 -ri .

package:
	../../utils/package_python_lambda.sh meshacknowledgelambda

clean:
	rm -rf target

.PHONY: install install-dev test coverage lint format package clean
