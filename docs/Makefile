SHELL := /bin/bash

BASE_URL ?= "/"
VERSION ?= ""
SCHEMA_PATTERN = *.schema.json
SCHEMA_DOCS_PATTERN = *.md
SCHEMA_YAML_DOCS_PATTERN= *.yaml
SRC_BASE_DIR = ../src
SCHEMA_BASE_INPUT_DIR = $(SRC_BASE_DIR)/cloudeventjekylldocs
SCHEMA_SRC_BASE_DIR = $(SRC_BASE_DIR)/cloudevents
SCHEMA_INPUT_DIR = $(SCHEMA_BASE_INPUT_DIR)/output/schemas
SCHEMA_DOCS_INPUT_DIR = $(SCHEMA_BASE_INPUT_DIR)/output/docs/md
SCHEMA_YAML_DOCS_INPUT_DIR = $(SCHEMA_BASE_INPUT_DIR)/output/docs/yaml
BASE_OUTPUT_DIR = _site
BASE_DOCS_OUTPUT_DIR = schemas
SCHEMA_OUTPUT_DIR = schemas
SCHEMA_DOCS_OUTPUT_DIR = $(BASE_DOCS_OUTPUT_DIR)
SCHEMA_YAML_DOCS_OUTPUT_DIR = _data/schema
SHELL = /bin/bash

EVENT_CAT_ROOT_DIR = $(SRC_BASE_DIR)/eventcatalog
EVENT_CAT_INPUT_DIR = $(SRC_BASE_DIR)/eventcatalog/dist
EVENT_CAT_OUTPUT_DIR = eventcatalog

BASE_URL_REMOVE_TRAILING_SLASH := $(patsubst %/,%,$(BASE_URL))
EVENT_CAT_URL := $(BASE_URL_REMOVE_TRAILING_SLASH)/$(EVENT_CAT_OUTPUT_DIR)

default: install

h help:
	@egrep '^\S|^$$' Makefile

install:
	./install.sh $(SRC_BASE_DIR)

s serve:
	npm run serve

define baseurlparam =
$(if $(BASE_URL),-- --baseurl $(BASE_URL),-- --baseurl "")
endef

test:
	./test.sh $(SRC_BASE_DIR)

build: clean build-schemas copy-schema-docs copy-schema-yaml-docs copy-schemas build-eventcatalog build-docs show-build-output

build-ci: build-schemas-ci copy-schema-docs copy-schema-yaml-docs copy-schemas build-eventcatalog build-docs show-build-output


build-eventcatalog:
	$(MAKE) build-eventcatalog-prereq
	make -C $(EVENT_CAT_ROOT_DIR) build BASE_URL=$(EVENT_CAT_URL)
	$(MAKE) build-eventcatalog-copy

build-eventcatalog-prereq:
	mkdir -p $(EVENT_CAT_OUTPUT_DIR)
	rm -rf $(EVENT_CAT_OUTPUT_DIR)/*
	mkdir -p $(EVENT_CAT_OUTPUT_DIR)/_astro
	touch $(EVENT_CAT_OUTPUT_DIR)/.nojekyll
	touch $(EVENT_CAT_OUTPUT_DIR)/_astro/.nojekyll

build-eventcatalog-copy:


	cp -r $(EVENT_CAT_INPUT_DIR)/. $(EVENT_CAT_OUTPUT_DIR)/


build-docs: version
	npm run build $(baseurlparam)


build-schemas-ci: clean-schemas
	make -C $(SCHEMA_SRC_BASE_DIR) deploy-ci
	make -C $(SCHEMA_BASE_INPUT_DIR) config
	make -C $(SCHEMA_BASE_INPUT_DIR) build

build-schemas: clean-schemas
	make -C $(SCHEMA_SRC_BASE_DIR) deploy
	make -C $(SCHEMA_BASE_INPUT_DIR) config
	make -C $(SCHEMA_BASE_INPUT_DIR) build
#	(cd $(SCHEMA_SCRIPTS_BASE_INPUT_DIR) && make config && make build)


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
	rm -rf assets-webpack
	rm -rf cloudevents

clean-docs:
	rm -rf $(BASE_OUTPUT_DIR)


clean-schemas:

	rm -rf $(SCHEMA_OUTPUT_DIR)
	rm -rf $(SCHEMA_DOCS_OUTPUT_DIR)
	rm -rf $(SCHEMA_YAML_DOCS_OUTPUT_DIR)
	rm -rf $(EVENT_CAT_OUTPUT_DIR)

debug: version
	bundle install --gemfile Gemfile-dev
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
