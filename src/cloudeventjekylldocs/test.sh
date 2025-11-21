#! /bin/bash
set -euo pipefail
PYTHON=$1

cd ../.. && \
$PYTHON -m pytest src/cloudeventjekylldocs/tests/ --cov=src/cloudeventjekylldocs --cov-config=src/cloudeventjekylldocs/pytest.ini --cov-report=html:src/cloudeventjekylldocs/htmlcov --cov-report=term-missing --cov-report=xml:src/cloudeventjekylldocs/coverage.xml
