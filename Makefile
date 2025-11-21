SHELL := /bin/bash

# This file is for you! Edit it to implement your own hooks (make targets) into
# the project as automated steps to be executed on locally and in the CD pipeline.

include scripts/init.mk

# ==============================================================================

# Example CI/CD targets are: dependencies, build, publish, deploy, clean, etc.

# make config: Config - this assumes all system dependencies are already installed, eg asdf etc. This is fine for default dev containers
# make dependencies: If using a clean environment, eg ubuntu native container, you must run make dependencies first to install system dependencies, before then running make config

quick-start: # Quick start target to setup, build and serve docs @Pipeline
	$(MAKE) install && \
	$(MAKE) clean && \
	$(MAKE) test-docs && \
	$(MAKE) build && \
	$(MAKE) serve-docs

install:
	./dependencies.sh --skip-system-deps

dependencies:
	./dependencies.sh

test-docs:
	@if $(MAKE) -C docs -n test >/dev/null 2>&1; then \
		$(MAKE) -C docs test; \
	else \
		echo "⚠️⚠️ WARNING: Test docs target does not exist in docs/Makefile, skipping..."; \
	fi

build: # Build the project artefact @Pipeline
	$(MAKE) -C docs build

debug:
	$(MAKE) -C docs debug

publish: # Publish the project artefact @Pipeline
	# Implement the artefact publishing step

deploy: # Deploy the project artefact to the target environment @Pipeline
	# Implement the artefact deployment step

clean:: # Clean-up project resources (main) @Operations
	$(MAKE) -C docs clean && \
	$(MAKE) -C src/cloudevents clean && \
	$(MAKE) -C src/eventcatalogasyncapiimporter clean && \
	$(MAKE) -C src/eventcatalogasyncapiimporter clean-output && \
	rm -f .version

config:: _install-dependencies version
	$(MAKE) install

serve-docs:
	$(MAKE) -C docs s

version:
	rm -f .version
	make version-create-effective-file dir=.
	echo "{ \"schemaVersion\": 1, \"label\": \"version\", \"message\": \"$$(head -n 1 .version 2> /dev/null || echo unknown)\", \"color\": \"orange\" }" > version.json
# ==============================================================================

${VERBOSE}.SILENT: \
	build \
	clean \
	config \
	dependencies \
	deploy \
