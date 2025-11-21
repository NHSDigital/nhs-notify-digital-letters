#! /bin/bash
set -euo pipefail

PYTHON=$1
cd ../.. && \
$PYTHON -m pytest src/eventcatalogasyncapiimporter/tests --cov=src/eventcatalogasyncapiimporter --cov-config=src/eventcatalogasyncapiimporter/pytest.ini --cov-report=html:src/eventcatalogasyncapiimporter/htmlcov --cov-report=term-missing --cov-report=xml:src/eventcatalogasyncapiimporter/coverage.xml
