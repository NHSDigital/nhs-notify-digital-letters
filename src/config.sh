#! /bin/bash
set -euo pipefail

echo "========== Installing cloudevents ==================" && \
make -C ./cloudevents install && \
echo "========== Installing asyncapigenerator ==================" && \
make -C ./asyncapigenerator install-dev && \
echo "========== Installing cloudeventjekylldocs ==================" && \
make -C ./cloudeventjekylldocs install-dev && \
echo "========== Installing eventcatalogasyncapiimporter ==================" && \
make -C ./eventcatalogasyncapiimporter install-dev
