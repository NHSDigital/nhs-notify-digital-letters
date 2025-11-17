# Makefile for supplier-allocation schemas
MAKEFILE_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

# Domain-specific settings
DOMAIN = digital-letters
SUPPORTED_VERSIONS = 2025-10-draft
DEFAULT_VERSION = 2025-10-draft
ROOT_DIR = $(shell cd $(MAKEFILE_DIR)../../../.. && pwd)

# Allow version override or build all
PUBLISH_VERSION ?= $(DEFAULT_VERSION)

# Helper targets for building a single version (used by the loop below)
.PHONY: build-one publish-one publish-json-one publish-yaml-one generate-one test-one deploy-one clean-one
build-one publish-one publish-json-one publish-yaml-one generate-one test-one deploy-one clean-one:
	@$(MAKE) -f ../common.mk $(subst -one,,$@) PUBLISH_VERSION=$(PUBLISH_VERSION) DOMAIN=$(DOMAIN) ROOT_DIR=$(ROOT_DIR)

# Main build targets
.PHONY: build publish publish-json publish-yaml generate test deploy clean
ifeq ($(PUBLISH_VERSION),all)
# Build all supported versions
build publish publish-json publish-yaml generate test deploy clean:
	@for ver in $(SUPPORTED_VERSIONS); do \
		echo ""; \
		echo "=== $(DOMAIN): $@ (version $$ver) ==="; \
		$(MAKE) $@-one PUBLISH_VERSION=$$ver || exit 1; \
	done
else
# Build specific version
build publish publish-json publish-yaml generate test deploy clean:
	@$(MAKE) -f ../common.mk $@ PUBLISH_VERSION=$(PUBLISH_VERSION) DOMAIN=$(DOMAIN) ROOT_DIR=$(ROOT_DIR)
endif
