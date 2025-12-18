# Makefile for all domain schemas - orchestrates subdomain Makefiles

# Force bash as the shell for PIPESTATUS support
SHELL := /bin/bash

MAKEFILE_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

DOMAINS = digital-letters
PUBLISH_VERSION ?= all

.PHONY: build publish publish-json publish-yaml generate test deploy clean

build:
	@echo "=== Building all domains (version: $(PUBLISH_VERSION)) ==="
	@for domain in $(DOMAINS); do \
		echo ""; \
		echo "--- Building domain: $$domain ---"; \
		$(MAKE) -C $(MAKEFILE_DIR)$$domain build PUBLISH_VERSION=$(PUBLISH_VERSION) || exit 1; \
	done
	@echo ""
	@echo "✅ All domains built successfully!"

publish:
	@echo "=== Publishing all domains (version: $(PUBLISH_VERSION)) ==="
	@for domain in $(DOMAINS); do \
		echo ""; \
		echo "--- Publishing domain: $$domain ---"; \
		$(MAKE) -C $(MAKEFILE_DIR)$$domain publish PUBLISH_VERSION=$(PUBLISH_VERSION) || exit 1; \
	done
	@echo ""
	@echo "✅ All domains published successfully!"

publish-json:
	@echo "=== Publishing all domains JSON (version: $(PUBLISH_VERSION)) ==="
	@for domain in $(DOMAINS); do \
		echo ""; \
		$(MAKE) -C $(MAKEFILE_DIR)$$domain publish-json PUBLISH_VERSION=$(PUBLISH_VERSION) || exit 1; \
	done
	@echo ""
	@echo "✅ All domains published (JSON) successfully!"

publish-yaml:
	@echo "=== Publishing all domains YAML (version: $(PUBLISH_VERSION)) ==="
	@for domain in $(DOMAINS); do \
		echo ""; \
		$(MAKE) -C $(MAKEFILE_DIR)$$domain publish-yaml PUBLISH_VERSION=$(PUBLISH_VERSION) || exit 1; \
	done
	@echo ""
	@echo "✅ All domains published (YAML) successfully!"

generate:
	@echo "=== Generating events for all domains (version: $(PUBLISH_VERSION)) ==="
	@for domain in $(DOMAINS); do \
		echo ""; \
		$(MAKE) -C $(MAKEFILE_DIR)$$domain generate PUBLISH_VERSION=$(PUBLISH_VERSION) || exit 1; \
	done
	@echo ""
	@echo "✅ All events generated successfully!"

test:
	@echo "=== Testing all domains (version: $(PUBLISH_VERSION)) ==="
	@FAILED=0; \
	GRAND_TOTAL_PASSED=0; \
	GRAND_TOTAL_TESTS=0; \
	DOMAIN_SUMMARIES=""; \
	ALL_TEST_RESULTS=""; \
	TMPFILE=$$(mktemp); \
	for domain in $(DOMAINS); do \
		echo ""; \
		set +e; \
		$(MAKE) -C $(MAKEFILE_DIR)$$domain test PUBLISH_VERSION=$(PUBLISH_VERSION) 2>&1 | tee $$TMPFILE; \
		TEST_EXIT=$${PIPESTATUS[0]}; \
		set -e; \
		if [ $$TEST_EXIT -ne 0 ]; then \
			FAILED=1; \
		fi; \
		DOMAIN_RESULT=$$(grep "DOMAIN_RESULTS:" $$TMPFILE | tail -1); \
		if [ -n "$$DOMAIN_RESULT" ]; then \
			DOMAIN_NAME=$$(echo "$$DOMAIN_RESULT" | awk '{print $$2}'); \
			PASSED=$$(echo "$$DOMAIN_RESULT" | awk '{print $$3}'); \
			TOTAL=$$(echo "$$DOMAIN_RESULT" | awk '{print $$4}'); \
			FAILED_FLAG=$$(echo "$$DOMAIN_RESULT" | awk '{print $$5}'); \
			GRAND_TOTAL_PASSED=$$((GRAND_TOTAL_PASSED + PASSED)); \
			GRAND_TOTAL_TESTS=$$((GRAND_TOTAL_TESTS + TOTAL)); \
			if [ $$FAILED_FLAG -eq 0 ]; then \
				STATUS="✅"; \
			else \
				STATUS="❌"; \
			fi; \
			DOMAIN_SUMMARIES="$$DOMAIN_SUMMARIES\n  $$DOMAIN_NAME: $$PASSED/$$TOTAL passed $$STATUS"; \
		fi; \
		TEST_RESULTS=$$(grep "TEST_RESULT:" $$TMPFILE); \
		if [ -n "$$TEST_RESULTS" ]; then \
			ALL_TEST_RESULTS="$$ALL_TEST_RESULTS$$TEST_RESULTS"$$'\n'; \
		fi; \
	done; \
	rm -f $$TMPFILE; \
	echo ""; \
	echo "========================================"; \
	echo "FINAL SUMMARY - All Domains"; \
	echo "========================================"; \
	echo ""; \
	echo "Total across all domains:"; \
	echo "  Tests run: $$GRAND_TOTAL_TESTS"; \
	echo "  Passed: $$GRAND_TOTAL_PASSED"; \
	echo "  Failed: $$((GRAND_TOTAL_TESTS - GRAND_TOTAL_PASSED))"; \
	echo ""; \
	echo "Per-domain summary:"; \
	printf "$$DOMAIN_SUMMARIES\n"; \
	echo ""; \
	echo "Individual test results:"; \
	RESULTS_TMPFILE=$$(mktemp); \
	echo "$$ALL_TEST_RESULTS" | grep "TEST_RESULT:" | sort -u > $$RESULTS_TMPFILE; \
	while IFS= read -r line; do \
		if [ -n "$$line" ]; then \
			RESULT=$$(echo "$$line" | sed 's/TEST_RESULT: //'); \
			STATUS=$$(echo "$$RESULT" | cut -d'|' -f1); \
			EVENT=$$(echo "$$RESULT" | cut -d'|' -f2); \
			SCHEMA=$$(echo "$$RESULT" | cut -d'|' -f3); \
			if [ "$$STATUS" = "PASS" ]; then \
				printf "  ✅ $$EVENT vs $$SCHEMA\n"; \
			else \
				printf "  ❌ $$EVENT vs $$SCHEMA\n"; \
			fi; \
		fi; \
	done < $$RESULTS_TMPFILE; \
	rm -f $$RESULTS_TMPFILE; \
	echo ""; \
	if [ $$FAILED -eq 0 ]; then \
		echo "✅ All tests passed across all domains"; \
	else \
		echo "❌ Some tests failed"; \
	fi; \
	echo "========================================"; \
	echo ""; \
	exit $$FAILED

deploy:
	@echo "=== Deploying all domains (version: $(PUBLISH_VERSION)) ==="
	@echo ""
	@echo "Step 1: Building and generating all domains..."
	@echo "================================================"
	@for domain in $(DOMAINS); do \
		echo ""; \
		echo "--- Building domain: $$domain ---"; \
		$(MAKE) -C $(MAKEFILE_DIR)$$domain build PUBLISH_VERSION=$(PUBLISH_VERSION) || exit 1; \
		echo ""; \
		echo "--- Generating events for domain: $$domain ---"; \
		$(MAKE) -C $(MAKEFILE_DIR)$$domain generate PUBLISH_VERSION=$(PUBLISH_VERSION) || exit 1; \
	done
	@echo ""
	@echo "✅ All domains built and events generated successfully!"
	@echo ""
	$(MAKE) test-and-publish

test-and-publish:
	@echo "Step 2: Testing all domains..."
	@echo "================================================"
	@if ! $(MAKE) test PUBLISH_VERSION=$(PUBLISH_VERSION); then \
		echo ""; \
		echo "❌❌❌ Tests failed - deployment aborted ❌❌❌"; \
		exit 1; \
	fi
	@echo ""
	@echo "✅ All tests passed!"
	@echo ""
	@echo "Step 3: Publishing all domains..."
	@echo "================================================"
	@for domain in $(DOMAINS); do \
		echo ""; \
		echo "--- Publishing domain: $$domain ---"; \
		$(MAKE) -C $(MAKEFILE_DIR)$$domain publish PUBLISH_VERSION=$(PUBLISH_VERSION) || exit 1; \
	done
	@echo ""
	@echo "✅✅✅ All domains deployed successfully! ✅✅✅"

clean:
	@echo "=== Cleaning all domains (version: $(PUBLISH_VERSION)) ==="
	@for domain in $(DOMAINS); do \
		$(MAKE) -C $(MAKEFILE_DIR)$$domain clean PUBLISH_VERSION=$(PUBLISH_VERSION); \
	done
	@echo ""
	@echo "✅ All domains cleaned!"
