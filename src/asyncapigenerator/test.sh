#! /bin/bash
set -euo pipefail
PYTHON=$1

cd ../.. && \
$PYTHON -m pytest src/asyncapigenerator/tests/ --cov=src/asyncapigenerator --cov-config=src/asyncapigenerator/pytest.ini --cov-report=html:src/asyncapigenerator/htmlcov --cov-report=term-missing --cov-report=xml:src/asyncapigenerator/coverage.xml
