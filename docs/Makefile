BASE_URL ?= "/"
VERSION ?= ""
SCHEMA_PATTERN = *.schema.json
SCHEMA_DOCS_PATTERN = *.md
SCHEMA_YAML_DOCS_PATTERN= *.yaml
SCHEMA_BASE_INPUT_DIR = ../schemas
SCHEMA_INPUT_DIR = $(SCHEMA_BASE_INPUT_DIR)/output/schemas
SCHEMA_DOCS_INPUT_DIR = $(SCHEMA_BASE_INPUT_DIR)/output/docs/md
SCHEMA_YAML_DOCS_INPUT_DIR = $(SCHEMA_BASE_INPUT_DIR)/output/docs/yaml
BASE_OUTPUT_DIR = _site
BASE_DOCS_OUTPUT_DIR = schemas
SCHEMA_OUTPUT_DIR = $(BASE_OUTPUT_DIR)/schemas
SCHEMA_DOCS_OUTPUT_DIR = $(BASE_DOCS_OUTPUT_DIR)
SCHEMA_YAML_DOCS_OUTPUT_DIR = _data/schema
SHELL = /bin/bash

default: install

h help:
	@egrep '^\S|^$$' Makefile

install:
	npm install
	bundle config set --local path vendor/bundle
	bundle install

s serve:
	npm run

define baseurlparam =
$(if $(BASE_URL),-- --baseurl $(BASE_URL),-- --baseurl "")
endef

build: build-schemas copy-schema-docs copy-schema-yaml-docs build-docs copy-schemas show-build-output

build-docs: version
	npm run build $(baseurlparam)

build-schemas: clean-schemas
	(cd $(SCHEMA_BASE_INPUT_DIR) && make config && make build)


copy-schema-docs:
	mkdir -p $(SCHEMA_DOCS_OUTPUT_DIR)
	@echo "Finding schema docs files..."
	@find $(SCHEMA_DOCS_INPUT_DIR) -name "$(SCHEMA_DOCS_PATTERN)" -print
	@echo "Copying schema docs files..."
	rsync -av --include="*/" --include="$(SCHEMA_DOCS_PATTERN)" --exclude="*" $(SCHEMA_DOCS_INPUT_DIR)/ $(SCHEMA_DOCS_OUTPUT_DIR)/
	@echo "Output in $(SCHEMA_DOCS_OUTPUT_DIR):"
	@find $(SCHEMA_DOCS_OUTPUT_DIR) -type f -name "*" | sort


copy-schema-yaml-docs:
	mkdir -p $(SCHEMA_YAML_DOCS_OUTPUT_DIR)
	@echo "Finding schema YAML docs files..."
	@find $(SCHEMA_YAML_DOCS_INPUT_DIR) -name "$(SCHEMA_YAML_DOCS_PATTERN)" -print
	@echo "Copying schema YAML docs files..."
	rsync -av --include="*/" --include="$(SCHEMA_YAML_DOCS_PATTERN)" --exclude="*" $(SCHEMA_YAML_DOCS_INPUT_DIR)/ $(SCHEMA_YAML_DOCS_OUTPUT_DIR)/
	@echo "Output in $(SCHEMA_YAML_DOCS_OUTPUT_DIR):"
	@find $(SCHEMA_YAML_DOCS_OUTPUT_DIR) -type f -name "*" | sort

copy-schemas:
	mkdir -p $(SCHEMA_OUTPUT_DIR)
	@echo "Finding schema files..."
	@find $(SCHEMA_INPUT_DIR) -name "$(SCHEMA_PATTERN)" -print
	@echo "Copying schema files..."
	rsync -av --include="*/" --include="$(SCHEMA_PATTERN)" --exclude="*" $(SCHEMA_INPUT_DIR)/ $(SCHEMA_OUTPUT_DIR)/
	@echo "Output in $(SCHEMA_OUTPUT_DIR):"
	@find $(SCHEMA_OUTPUT_DIR) -type f -name "*" | sort

show-build-output:
	@echo "Build output in $(BASE_OUTPUT_DIR):"
	@find $(BASE_OUTPUT_DIR) -type f -name "*" | sort

clean: clean-docs clean-schemas
clean-docs:
	rm -rf $(BASE_OUTPUT_DIR)


clean-schemas:
	rm -rf $(SCHEMA_OUTPUT_DIR)
	rm -rf $(SCHEMA_DOCS_OUTPUT_DIR)
	rm -rf $(SCHEMA_YAML_DOCS_OUTPUT_DIR)

debug: version
	npm run debug

version:
	touch _config.version.yml
	if [[ $(VERSION) == "" ]]; then \
		(cd .. && make version); \
		ver=$$(head -n 1 ../.version 2> /dev/null || echo unknown); \
		echo "version: $$ver" > _config.version.yml; \
		echo "$$ver" > .version; \
	else \
		echo "version: $(VERSION)" > _config.version.yml; \
		echo "$(VERSION)" > .version; \
	fi

	echo "{ \"schemaVersion\": 1, \"label\": \"version\", \"message\": \"$$(head -n 1 .version 2> /dev/null || echo unknown)\", \"color\": \"orange\" }" > version.json
