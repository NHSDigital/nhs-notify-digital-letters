BASE_URL ?= /
BASE_URL_REMOVE_TRAILING_SLASH := $(patsubst %/,%,$(BASE_URL))
# Remove all leading slashes using shell command, then ensure exactly one leading slash
BASE_URL_NO_LEADING := $(shell echo "$(BASE_URL_REMOVE_TRAILING_SLASH)" | sed 's:^/*::')
EVENT_CAT_URL := /$(BASE_URL_NO_LEADING)
baseurlparam := -- --base=$(EVENT_CAT_URL)

show-info:
	@echo "Base path is: $(EVENT_CAT_URL)"
	@echo "Base param is: $(baseurlparam)"

rebuild-static: install-serve-static clean-static build-static serve-static

install-serve-static:
	npm install --save-dev http-server

clean-static:
	rm -rf .preview
	rm -rf dist

build-static: show-info
	npx eventcatalog build $(baseurlparam)

serve-static:
	@echo "Setting up preview server structure..."
	@mkdir -p .preview$(EVENT_CAT_URL)
	@cp -r dist/* .preview$(EVENT_CAT_URL)/
	@echo "Starting static server..."
	@echo "Navigate to: http://localhost:8080$(EVENT_CAT_URL)"
	npx http-server .preview -p 8080 -o $(EVENT_CAT_URL)


build: clean show-info
	make -C ../asyncapigenerator generate
	make -C ../eventcatalogasyncapiimporter import
	npm install
	npm run build $(baseurlparam)

serve:
	npm run dev

clean:
	rm -rf .eventcatalog-core
	rm -rf dist
	rm -rf node_modules
	rm -rf .preview
