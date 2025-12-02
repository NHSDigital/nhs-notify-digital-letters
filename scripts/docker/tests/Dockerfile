# `*:latest` will be replaced with a corresponding version stored in the '.tool-versions' file
# hadolint ignore=DL3007
FROM python:latest

# Create a non-root user for running the application
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Switch to non-root user
USER appuser
