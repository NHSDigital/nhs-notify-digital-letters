#! /bin/bash
set -euo pipefail

cd ./asyncapigenerator && \
./test.sh python3 && \
cd .. && \

cd ./eventcatalogasyncapiimporter && \
./test.sh python3 && \
cd .. && \

cd ./cloudeventjekylldocs && \
./test.sh python3 && \
cd .. && \

cd ./cloudevents && \
npm run test:unit
