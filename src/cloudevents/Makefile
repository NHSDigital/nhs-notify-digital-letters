# Makefile for cloudevents - orchestrates src/ subdomain Makefiles

# Get absolute path of this Makefile's directory
DOCS_RELATIVE_PATH = ../../docs/cloudevents
MAKEFILE_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))



# Allow version override (default is set in src/Makefile)



PUBLISH_VERSION ?= all
CLOUDEVENTS_BASE_PATH = $(shell mkdir -p $(MAKEFILE_DIR)domains && cd $(MAKEFILE_DIR)domains && pwd)
OUTPUT_BASE_PATH = $(shell mkdir -p $(MAKEFILE_DIR)../../output && cd $(MAKEFILE_DIR)../../output && pwd)
SCHEMAS_BASE_PATH = $(shell mkdir -p $(MAKEFILE_DIR)../../schemas && cd $(MAKEFILE_DIR)../../schemas && pwd)
DOCS_BASE_PATH = $(shell mkdir -p $(MAKEFILE_DIR)$(DOCS_RELATIVE_PATH) && cd $(MAKEFILE_DIR)$(DOCS_RELATIVE_PATH) && pwd)
TOOLS_BASE_PATH = $(shell mkdir -p $(MAKEFILE_DIR)tools && cd $(MAKEFILE_DIR)tools && pwd)

.PHONY: build publish publish-json publish-yaml generate test-domains deploy clean build-docs update-readme test test-unit coverage

config:: _install-dependencies version # Configure development environment (main) @Configuration
	npm install

install:
		npm install

test:: test-unit # Run all tests @Testing

test-unit: # Run unit tests @Testing
	npm run test:unit

coverage: # Run tests with coverage @Testing
	npm run test:coverage

build:
	@echo "=== Building all schemas (version: $(PUBLISH_VERSION)) ==="
	$(MAKE) -C $(CLOUDEVENTS_BASE_PATH) build PUBLISH_VERSION=$(PUBLISH_VERSION)

publish:
	@echo "=== Publishing all schemas (JSON + YAML, version: $(PUBLISH_VERSION)) ==="
	$(MAKE) -C $(CLOUDEVENTS_BASE_PATH) publish PUBLISH_VERSION=$(PUBLISH_VERSION)

publish-json:
	@echo "=== Publishing all schemas (JSON only, version: $(PUBLISH_VERSION)) ==="
	$(MAKE) -C $(CLOUDEVENTS_BASE_PATH) publish-json PUBLISH_VERSION=$(PUBLISH_VERSION)

publish-yaml:
	@echo "=== Publishing all schemas (YAML only, version: $(PUBLISH_VERSION)) ==="
	$(MAKE) -C $(CLOUDEVENTS_BASE_PATH) publish-yaml PUBLISH_VERSION=$(PUBLISH_VERSION)

generate:
	@echo "=== Generating all events (version: $(PUBLISH_VERSION)) ==="
	$(MAKE) -C $(CLOUDEVENTS_BASE_PATH) generate PUBLISH_VERSION=$(PUBLISH_VERSION)

test-domains:
	@echo "=== Running all tests (version: $(PUBLISH_VERSION)) ==="
	$(MAKE) -C $(CLOUDEVENTS_BASE_PATH) test PUBLISH_VERSION=$(PUBLISH_VERSION)

deploy:
	@echo "=== Deploying all schemas (version: $(PUBLISH_VERSION)) ==="
	$(MAKE) clean
	$(MAKE) -C $(CLOUDEVENTS_BASE_PATH) deploy PUBLISH_VERSION=$(PUBLISH_VERSION)
	$(MAKE) build-docs
	$(MAKE) update-readme
	@echo ""
	@echo "✅ Build complete: local schemas tested and distribution schemas ready!"

clean::
	@echo "=== Cleaning output/ and schemas/ directories ==="
	npm run clear-cache
	npm run cache-info
	rm -rf $(OUTPUT_BASE_PATH)
	rm -rf $(SCHEMAS_BASE_PATH)
	rm -rf $(DOCS_BASE_PATH)
	rm -rf .version
	rm -f version.json
	@echo ""

build-docs:
	@echo "=== Generating documentation for all schemas ==="
	@echo "OUTPUT_BASE_PATH: $(OUTPUT_BASE_PATH)"
	@echo "DOCS_BASE_PATH: $(DOCS_BASE_PATH)"
	@echo "MAKEFILE_DIR: $(MAKEFILE_DIR)"
	@echo "DOCS_RELATIVE_PATH: $(DOCS_RELATIVE_PATH)"
	@echo "COMPUTED PATH: $(shell cd $(MAKEFILE_DIR)$(DOCS_RELATIVE_PATH) && pwd)"

	npm run build-docs -- $(OUTPUT_BASE_PATH) $(DOCS_BASE_PATH)

update-readme:
	@echo "=== Updating README tables ==="
	npm run update-readme -- $(DOCS_BASE_PATH)
#	node $(TOOLS_BASE_PATH)/generator/update-readme.cjs $(DOCS_BASE_PATH)
	@echo ""

asdf-manual-install:
	@echo "testing manual installation"
	curl -LO https://github.com/asdf-vm/asdf/releases/download/v0.18.0/asdf-v0.18.0-linux-amd64.tar.gz && \
	tar -xvzf asdf-v0.18.0-linux-amd64.tar.gz -C /usr/local/bin && \
	chmod +x /usr/local/bin/asdf && \
	pwd && \
	ls -la
	@echo "from manual test tools versions file contains:"
	cat .tool-versions
	/usr/local/bin/asdf --version
	@echo "Setting up asdf environment and adding plugins"
	export ASDF_DATA_DIR=$$HOME/.asdf && \
	export PATH=$$ASDF_DATA_DIR/shims:$$ASDF_DATA_DIR/bin:/usr/local/bin:$$PATH && \
	echo "Adding plugins from .tool-versions" && \
	while IFS=' ' read -r plugin version || [ -n "$$plugin" ]; do \
		plugin=$$(echo "$$plugin" | xargs); \
		first_char=$$(echo "$$plugin" | cut -c1); \
		if [ -n "$$plugin" ] && [ "$$first_char" != "#" ]; then \
			echo "Adding plugin: $$plugin (version: $$version)" && \
			/usr/local/bin/asdf plugin add "$$plugin" 2>&1 || echo "  -> Plugin $$plugin already added or failed"; \
		fi \
	done < .tool-versions && \
	echo "Listing available plugins:" && \
	/usr/local/bin/asdf plugin list && \
	echo "Installing asdf versions" && \
	/usr/local/bin/asdf install -v && \
	echo "Installed versions:" && \
	/usr/local/bin/asdf list && \
	echo "Node is at:" && \
	whereis node && \
	echo "Chosen one is at:" && \
	which node && \
	echo "Node version is:" && \
	node --version
	@echo "manual installation complete"

asdf-install-test:
	@echo "testing asdf installation"
	@echo "current directory is:"
	ls -la
	@echo "tools versions file contains:"
	cat .tool-versions
	@echo "installing asdf versions"
	asdf install
	@echo "asdf installation complete"

deploy-ci:
	echo "=== Setting up environment for CI unit tests ===" && \
	curl -LO https://github.com/asdf-vm/asdf/releases/download/v0.18.0/asdf-v0.18.0-linux-amd64.tar.gz && \
	tar -xvzf asdf-v0.18.0-linux-amd64.tar.gz -C /usr/local/bin && \
	chmod +x /usr/local/bin/asdf && \
	pwd && \
	ls -la
	@echo "from manual test tools versions file contains:"
	cat .tool-versions
	/usr/local/bin/asdf --version
	@echo "Setting up asdf environment and adding plugins"
	export ASDF_DATA_DIR=$$HOME/.asdf && \
	export PATH=$$ASDF_DATA_DIR/shims:$$ASDF_DATA_DIR/bin:/usr/local/bin:$$PATH && \
	echo "Adding plugins from .tool-versions" && \
	while IFS=' ' read -r plugin version || [ -n "$$plugin" ]; do \
		plugin=$$(echo "$$plugin" | xargs); \
		first_char=$$(echo "$$plugin" | cut -c1); \
		if [ -n "$$plugin" ] && [ "$$first_char" != "#" ]; then \
			echo "Adding plugin: $$plugin (version: $$version)" && \
			/usr/local/bin/asdf plugin add "$$plugin" 2>&1 || echo "  -> Plugin $$plugin already added or failed"; \
		fi \
	done < .tool-versions && \
	echo "Listing available plugins:" && \
	/usr/local/bin/asdf plugin list && \
	echo "Installing asdf versions" && \
	/usr/local/bin/asdf install -v && \
	echo "Installed versions:" && \
	/usr/local/bin/asdf list && \
	echo "Node is at:" && \
	whereis node && \
	echo "Chosen one is at:" && \
	which node && \
	echo "Node version is:" && \
	node --version && \
	npm install && \
	echo "=== Finished installing dependencies ===" && \
	asdf info && \
	asdf current && \
	node --version && \
	npm --version && \
	make deploy
