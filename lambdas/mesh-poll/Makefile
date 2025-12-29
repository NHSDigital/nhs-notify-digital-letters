PACKAGE=mesh_poll
VERSION=0.1.0

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements-dev.txt

test:
	cd ../.. && PYTHONPATH=lambdas/mesh-poll:$$PYTHONPATH pytest lambdas/mesh-poll/mesh_poll/__tests__/ -v

coverage:
	cd ../.. && PYTHONPATH=lambdas/mesh-poll:$$PYTHONPATH pytest lambdas/mesh-poll/mesh_poll/__tests__/ \
		--cov=lambdas/mesh-poll/mesh_poll \
		--cov-config=lambdas/mesh-poll/pytest.ini \
		--cov-report=html:lambdas/mesh-poll/htmlcov \
		--cov-report=term-missing \
		--cov-report=xml:lambdas/mesh-poll/coverage.xml \
		--cov-branch

lint:
	pylint mesh_poll

format:
	autopep8 -ri .

package:
	./package_python_lambda.sh meshpolllambda

clean:
	rm -rf target

.PHONY: install install-dev test coverage lint format package clean
