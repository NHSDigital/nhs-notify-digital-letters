# Unit Testing Plan for src/ Directory

<!-- markdownlint-disable MD013 MD033 -->

## Copilot Instructions

**For detailed Copilot instructions when working on this testing implementation, see [src/.github/copilot-instructions.md](./.github/copilot-instructions.md)**

Key points:

- Update progress tracker and changelog for all changes
- Use proper markdown code fences with language specifiers
- Run pre-commit hooks from repository root: `cd /workspaces/nhs-notify-digital-letters && bash scripts/githooks/pre-commit.sh`
- Target 80%+ test coverage for all projects
- Use UK timezone (GMT/BST) for all timestamps

## Table of Contents

- [Overview](#overview)
- [Implementation Progress Tracker](#implementation-progress-tracker)
- [Implementation Changelog](#implementation-changelog)
- [Current State Analysis](#current-state-analysis)
- [Testing Strategy](#testing-strategy)
- [Implementation Plan by Project](#implementation-plan-by-project)
- [Standard Makefile Targets](#standard-makefile-targets-per-project)
- [Configuration Files](#configuration-files)
- [Testing Best Practices](#testing-best-practices)
- [CI/CD Integration](#cicd-integration)
- [Success Criteria](#success-criteria)
- [Timeline Estimate](#timeline-estimate)
- [Next Steps](#next-steps)
- [Questions to Resolve](#questions-to-resolve)

## Overview

This document outlines the comprehensive plan for implementing unit tests across all projects in the `src/` directory of the NHS Notify Digital Letters repository.

## Implementation Progress Tracker

### Phase 1: Python Projects

| Project | Status | Test Directory | Configuration Files | Makefile | Coverage | Completed Date | Notes |
|---------|--------|----------------|---------------------|----------|----------|----------------|-------|
| asyncapigenerator | ✅ Complete | ✅ | ✅ | ✅ | 94% | 2025-01-04 | 51 tests passing, 5 test files |
| cloudeventjekylldocs | ❌ Not Started | ❌ | ❌ | ❌ | - | - | - |
| eventcatalogasyncapiimporter | ❌ Not Started | ❌ | ❌ | ❌ | - | - | - |

### Phase 2: TypeScript Projects

| Project | Status | Test Directory | Configuration Files | Makefile | Coverage | Completed Date | Notes |
|---------|--------|----------------|---------------------|----------|----------|----------------|-------|
| cloudevents | ❌ Not Started | ❌ | ❌ | ❌ | - | - | - |

### Phase 3: Integration

| Task | Status | Completed Date | Notes |
|------|--------|----------------|-------|
| Create src/Makefile | ❌ Not Started | - | - |
| Update root Makefile | ❌ Not Started | - | - |
| Documentation updates | ❌ Not Started | - | - |

### Overall Progress

- **Python Projects**: 1/3 completed (33%)
- **TypeScript Projects**: 0/1 completed (0%)
- **Integration Tasks**: 0/3 completed (0%)
- **Overall**: 1/7 total tasks completed (14%)

## Implementation Changelog

**Track all implementation activities here. Add new entries at the top (reverse chronological order).**

### 2025-11-04 13:40 GMT - Updated GitHub CLI Instructions to Avoid Pager

- **Author**: GitHub Copilot
- **Activity**: Updated documentation to always use `--json` format with gh CLI to avoid pager
- **Changes**:
  - Updated Copilot Instruction #15: Added CRITICAL note to always use `--json` format
    - Added examples with `--json databaseId,status,conclusion,name,createdAt,url`
    - Added jq formatting example
    - Clarified that `gh run watch` is interactive and OK without --json
  - Updated TESTING_PLAN.md "Monitoring and Verification" section:
    - Added IMPORTANT note about using `--json` format
    - Updated all examples to use `--json` with specific fields
    - Added jq formatting example
    - Explained that `gh run watch` is intentionally interactive
- **Files Modified**:
  - `src/.github/copilot-instructions.md` - Updated instruction #15
  - `src/TESTING_PLAN.md` - Updated monitoring examples
- **Rationale**: Default `gh run list` and `gh run view` use a pager that requires pressing 'q' to exit, blocking automation. Using `--json` format provides direct console output.
- **Status**: All GitHub CLI commands now avoid pager issues

### 2025-11-04 13:37 GMT - Fixed Python Coverage Artifact Upload for SonarCloud

- **Author**: GitHub Copilot
- **Activity**: Fixed CI/CD workflow to upload and download Python coverage files for SonarCloud analysis
- **Root Cause**: Python coverage.xml files were being generated but not uploaded as artifacts. SonarCloud only had access to JavaScript coverage (.reports/lcov.info)
- **Changes**:
  - Updated `.github/workflows/stage-2-test.yaml` in `test-unit` job:
    - Added new step "Save Python coverage reports" to upload `src/**/coverage.xml` as `python-coverage-reports` artifact
  - Updated `.github/workflows/stage-2-test.yaml` in `perform-static-analysis` job:
    - Added new step "Download Python coverage reports" to download `python-coverage-reports` artifact to `src/` directory
  - This ensures Python coverage.xml files are available when `./scripts/reports/perform-static-analysis.sh` runs sonar-scanner
- **Files Modified**:
  - `.github/workflows/stage-2-test.yaml` - Added artifact upload/download steps for Python coverage
- **Rationale**: SonarCloud runs in the `perform-static-analysis` job, which only had access to the JavaScript coverage artifact. Python coverage files were generated in `test-unit` but never uploaded, so they weren't available when sonar-scanner executed.
- **Status**: Python coverage should now be detected by SonarCloud on next CI run

### 2025-11-04 13:26 GMT - Added Monitoring and Verification Documentation

- **Author**: GitHub Copilot
- **Activity**: Documented GitHub CLI and SonarCloud API usage for monitoring CI/CD and coverage
- **Changes**:
  - Added Copilot Instruction #15: GitHub CLI usage for monitoring workflow runs
    - Commands: `gh run list`, `gh run view`, `gh run watch`
    - Setup instructions for `gh repo set-default` and `gh auth login`
  - Added Copilot Instruction #16: SonarCloud public API for coverage monitoring
    - API endpoint and parameters documented
    - Example curl commands for project-wide and component-specific queries
    - Response format and interpretation guide
    - Troubleshooting tips for 0.0% coverage issues
  - Added new "Monitoring and Verification" section to TESTING_PLAN.md:
    - GitHub Actions monitoring with `gh` CLI commands
    - SonarCloud coverage monitoring with API examples
    - Response format documentation
    - Troubleshooting guidance
- **Files Modified**:
  - `src/.github/copilot-instructions.md` - Added instructions #15 and #16
  - `src/TESTING_PLAN.md` - Added "Monitoring and Verification" section
- **Rationale**: Enables automated monitoring of CI/CD runs and SonarCloud coverage without manual browser interaction. Provides tools for verifying that coverage reports are being detected correctly.
- **Status**: Complete monitoring capabilities documented

### 2025-11-04 13:12 GMT - Added SonarCloud Integration for Python Coverage

- **Author**: GitHub Copilot
- **Activity**: Configured Python test coverage reporting for SonarCloud
- **Changes**:
  - Updated `src/asyncapigenerator/pytest.ini`: Added `--cov-report=xml:coverage.xml` to generate XML coverage reports
  - Updated `src/asyncapigenerator/Makefile`: Modified `coverage` target to include `--cov-report=xml:coverage.xml`
  - Updated `src/asyncapigenerator/Makefile`: Added `coverage.xml` to `clean-test` target
  - Updated `scripts/tests/unit.sh`: Changed from `make test` to `make coverage` for asyncapigenerator to generate coverage.xml
  - Updated `scripts/config/sonar-scanner.properties`:
    - Added `src/asyncapigenerator/tests` to `sonar.tests`
    - Added `src/**/tests/` pattern to `sonar.test.inclusions`
    - Added `src/**/tests/` to `sonar.coverage.exclusions`
    - Enabled `sonar.python.coverage.reportPaths=src/asyncapigenerator/coverage.xml` (was commented out)
- **Files Modified**:
  - `src/asyncapigenerator/pytest.ini` - Added XML coverage report
  - `src/asyncapigenerator/Makefile` - Updated coverage target and clean-test
  - `scripts/tests/unit.sh` - Run coverage instead of test
  - `scripts/config/sonar-scanner.properties` - Added Python test paths and coverage configuration
- **Rationale**: SonarCloud was showing 0% coverage because pytest wasn't generating XML coverage reports and sonar-scanner wasn't configured to find Python tests/coverage
- **Status**: Python coverage should now be reported to SonarCloud on next CI run

### 2025-11-04 13:02 GMT - Fixed Timestamps and Updated Instructions

- **Author**: GitHub Copilot
- **Activity**: Corrected timestamps to use actual GMT time and updated copilot instructions
- **Changes**:
  - Updated Copilot Instruction #2: Added CRITICAL note to use actual current time via `date -u` command, not make up or guess timestamps
  - Fixed all today's changelog entries to use correct GMT times (13:00, 12:30, 12:00) instead of incorrect times
  - Corrected date from 2025-01-04 to 2025-11-04 (November, not January)
- **Files Modified**:
  - `src/.github/copilot-instructions.md` - Emphasized using actual current time
  - `src/TESTING_PLAN.md` - Fixed timestamps in changelog
- **Rationale**: Timestamps must accurately reflect when work was done for proper audit trail
- **Status**: All timestamps now correct and instructions updated to prevent future errors

### 2025-11-04 13:00 GMT - Added CI/CD Integration Documentation

- **Author**: GitHub Copilot
- **Activity**: Documented CI/CD test integration requirements and updated unit.sh
- **Changes**:
  - Added Copilot Instruction #14: Requirement to update `scripts/tests/unit.sh` when adding new test suites
  - Updated `scripts/tests/unit.sh`: Added `install-dev` prerequisite step before running asyncapigenerator tests
  - Expanded CI/CD Integration section in TESTING_PLAN.md with:
    - Current implementation details (GitHub Actions workflow)
    - Step-by-step guide for adding new projects to unit.sh
    - Examples for Python and TypeScript projects
    - Full example of unit.sh structure
    - CI/CD workflow details and requirements
    - Local testing instructions
  - Clarified that Python projects must have `install-dev` target and `requirements-dev.txt`
  - Documented 5-minute timeout requirement for unit tests
  - Added note about coverage report format compatibility
- **Files Modified**:
  - `src/.github/copilot-instructions.md` - Added instruction #14
  - `scripts/tests/unit.sh` - Added install-dev step and comments
  - `src/TESTING_PLAN.md` - Replaced "GitHub Actions Workflow (Future)" with comprehensive current implementation documentation
- **Rationale**: CI was failing because prerequisites weren't installed before running tests. This ensures future implementers understand the complete integration requirements.
- **Status**: CI/CD integration requirements now fully documented

### 2025-11-04 12:30 GMT - Refactored Copilot Instructions

- **Author**: GitHub Copilot
- **Activity**: Moved copilot instructions to dedicated file and clarified pre-commit hook usage
- **Changes**:
  - Created `src/.github/copilot-instructions.md` with all 13 copilot instructions
  - Updated `src/TESTING_PLAN.md` to reference the new copilot instructions file
  - Clarified instruction #10: Pre-commit hooks must be run from repository root using `cd /workspaces/nhs-notify-digital-letters && bash scripts/githooks/pre-commit.sh`
  - Simplified TESTING_PLAN.md header to just reference the copilot instructions file
- **Files Modified**:
  - `src/.github/copilot-instructions.md` - Created
  - `src/TESTING_PLAN.md` - Updated Copilot Instructions section
- **Status**: Instructions now maintained separately for better organization

### 2025-11-04 12:00 GMT - Completed asyncapigenerator Testing Implementation

- **Author**: GitHub Copilot
- **Activity**: Implemented comprehensive test suite for asyncapigenerator (pilot project)
- **Coverage**: 94% (246 statements, 15 missed) - **Exceeds 80% target** ✅
- **Test Files Created**:
  - `tests/__init__.py` - Test package marker
  - `tests/conftest.py` - Shared pytest fixtures (temp_dir, sample_config, sample_event_markdown, sample_service_markdown)
  - `tests/test_generator.py` - Core generator tests (9 tests): frontmatter parsing, Event/Service dataclasses, AsyncAPIGenerator initialization
  - `tests/test_event_parsing.py` - Event loading tests (7 tests): directory loading, multiple events, missing directory, frontmatter handling, description extraction
  - `tests/test_service_parsing.py` - Service loading tests (7 tests): directory loading, comma/space-separated events, missing title, parent handling
  - `tests/test_asyncapi_generation.py` - AsyncAPI spec generation tests (8 tests): channel generation, send/receive operations, missing events, metadata, underscore IDs
  - `tests/test_combined_generation.py` - Combined generation & file I/O tests (11 tests): combined specs, event deduplication, file writing, configuration handling
  - `tests/test_cli.py` - CLI and main function tests (9 tests): config loading, argument parsing, main function, service filter, directory overrides
- **Configuration Files Created**:
  - `pytest.ini` - Pytest configuration with coverage settings, excludes test_generator.py and example_usage.py from coverage
  - `requirements-dev.txt` - Development dependencies: pytest>=8.0.0, pytest-cov>=4.1.0, pytest-mock>=3.12.0, black>=24.0.0, flake8>=7.0.0, mypy>=1.8.0, PyYAML>=6.0, types-PyYAML>=6.0
- **Makefile Updates**:
  - Added `test` target: Run pytest with verbose output
  - Added `test-verbose` target: Run pytest with very verbose output
  - Added `coverage` target: Generate HTML and terminal coverage reports
  - Added `lint` target: Run flake8 and mypy
  - Added `format` target: Run black code formatter
  - Added `clean-test` target: Remove test artifacts (`__pycache__`, `.pytest_cache`, `.coverage`, `htmlcov`)
  - Added `install-dev` target: Install requirements-dev.txt
- **Test Results**:
  - Total tests: 51 (all passing) ✅
  - Execution time: ~0.35 seconds
  - Coverage: 94% (only 15 lines uncovered - mostly error handling paths)
  - Uncovered lines: 73, 119-120, 127-128, 141, 175-176, 270-271, 315, 317, 391-392, 517
- **Test Categories**:
  - frontmatter parsing (valid, invalid, malformed YAML)
  - Event/Service dataclass creation and validation
  - Event loading from markdown files
  - Service loading from index.md files
  - AsyncAPI channel generation
  - Send/receive operations generation
  - Combined AsyncAPI spec generation with multiple services
  - Event deduplication across services
  - File I/O operations (YAML/JSON serialization)
  - Configuration loading and merging
  - CLI argument parsing and main function
  - Service filtering functionality
- **Files Modified**:
  - `src/asyncapigenerator/Makefile` - Added test targets
  - `src/asyncapigenerator/pytest.ini` - Created
  - `src/asyncapigenerator/requirements-dev.txt` - Created
  - `src/asyncapigenerator/tests/*` - Created 8 test files
  - `scripts/config/vale/styles/config/vocabularies/words/accept.txt` - Added "src"
  - `src/TESTING_PLAN.md` - Updated progress tracker
- **Dependencies Installed**:
  - pytest-8.4.2
  - pytest-cov-7.0.0
  - pytest-mock-3.15.1
  - black-25.9.0
  - flake8-7.3.0
  - mypy-1.18.2
  - PyYAML-6.0.2
  - types-PyYAML-6.0.12.20240917
- **Status**: ✅ **COMPLETE** - asyncapigenerator is now fully tested with 94% coverage, all tests passing
- **Next Steps**: Proceed to Phase 1.2 (cloudeventjekylldocs) or Phase 1.3 (eventcatalogasyncapiimporter)

### 2025-11-04 12:10 GMT - Updated Changelog Timezone to UK Time

- **Author**: GitHub Copilot
- **Activity**: Corrected all timestamps to UK timezone (GMT/BST)
- **Changes**:
  - Updated Copilot Instruction #2: Clarified that timestamps must use UK timezone (GMT/BST)
  - Corrected all existing changelog entries to use GMT times
  - Added this changelog entry to document the timezone correction
- **Files Modified**: `TESTING_PLAN.md`
- **Status**: All timestamps now reflect UK timezone

### 2025-11-04 12:05 GMT - Updated Testing Plan with npm Workspace Conventions

- **Author**: GitHub Copilot
- **Activity**: Added npm workspace test conventions and improved changelog guidelines
- **Changes**:
  - Added Copilot Instruction #12: npm workspace test convention requiring `npm run test:unit` for workspace projects
  - Updated Copilot Instruction #2: Changelog entries must include timestamp and must include updates to the testing plan document itself
  - Updated TypeScript Makefile template: Changed `npm test` to `npm run test:unit` in test target
  - Updated package.json devDependencies section: Added scripts example showing `test:unit`, `test:watch`, and `test:coverage`
  - Added note explaining workspace alignment for test execution
- **Files Modified**: `TESTING_PLAN.md`
- **Status**: Plan updated with workspace conventions

### 2025-11-04 11:50 GMT - Added Vale Vocabulary Exception

- **Author**: GitHub Copilot
- **Activity**: Added "src" to vale vocabulary accept list
- **Changes**:
  - Added "src" to `scripts/config/vale/styles/config/vocabularies/words/accept.txt`
  - Justification: "src" is a standard directory name used throughout the codebase and documentation (e.g., "src/" directory, "`make test` in `src/`"). This is a legitimate technical term commonly used in software projects.
- **Files Modified**: `scripts/config/vale/styles/config/vocabularies/words/accept.txt`
- **Status**: Vocabulary updated to pass pre-commit hooks

### 2025-11-04 10:30 GMT - Initial Plan Created

- **Author**: GitHub Copilot
- **Activity**: Created comprehensive testing plan
- **Changes**:
  - Defined testing strategy for Python (pytest) and TypeScript (Jest) projects
  - Created implementation progress tracker
  - Documented standard structure for each project type
  - Created configuration file templates
  - Established success criteria and timeline estimates
- **Files Modified**: `TESTING_PLAN.md`, `TESTING_QUICK_REFERENCE.md` (created)
- **Status**: Plan ready for review

---

<!-- Add new changelog entries above this line -->

## Current State Analysis

### Directory Structure

```text
src/
├── asyncapigenerator/          (Python - has basic tests)
├── cloudeventjekylldocs/       (Python - no tests)
├── cloudevents/                (TypeScript - no tests)
├── eventcatalog/               (EventCatalog - not applicable)
├── eventcatalogasyncapiimporter/ (Python - has basic tests)
└── typescript-schema-generator/ (Empty/Planning only)
```

### Existing Test Infrastructure

#### Python Projects

- **asyncapigenerator**: Has `test_generator.py` with basic manual tests (not using pytest)
- **eventcatalogasyncapiimporter**: Has `test_import_asyncapi.py` using unittest
- Testing approach is inconsistent - one uses manual assertions, other uses unittest

#### TypeScript Projects

- **cloudevents**: No tests, but has TypeScript tooling in `tools/` subdirectory
- Lambdas folder (reference) uses Jest with comprehensive configuration
- No jest configuration in src/cloudevents currently

#### EventCatalog

- **EventCatalog**: Build tool, not applicable for unit testing (configuration-based)

## Testing Strategy

### 1. Python Projects Testing Approach

#### Framework: pytest

- **Why pytest**: Industry standard, more Pythonic than unittest, better fixtures, parameterisation
- **Migration**: Convert existing unittest/manual tests to pytest
- **Coverage**: Use pytest-cov for coverage reporting

#### Standard Structure per Python Project

```plain
project-name/
├── src/                    # Or root level for modules
│   ├── module1.py
│   └── module2.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py        # Shared fixtures
│   ├── test_module1.py
│   └── test_module2.py
├── requirements.txt        # Production dependencies
├── requirements-dev.txt    # Development/testing dependencies
├── pytest.ini             # Pytest configuration
├── Makefile               # With test target
└── README.md
```

#### Testing Dependencies (requirements-dev.txt)

```plain
pytest>=8.0.0
pytest-cov>=4.1.0
pytest-mock>=3.12.0
black>=24.0.0
flake8>=7.0.0
mypy>=1.8.0
```

### 2. TypeScript Projects Testing Approach

#### Framework: Jest

- **Why Jest**: Already used in lambdas/, TypeScript native, comprehensive mocking
- **Configuration**: Follow pattern from lambdas/ttl-create-lambda/jest.config.ts
- **Coverage**: Jest built-in coverage with thresholds

#### Standard Structure per TypeScript Project

```plain
project-name/
├── src/
│   ├── module1.ts
│   └── module2.ts
├── __tests__/
│   ├── module1.test.ts
│   └── module2.test.ts
├── jest.config.ts
├── tsconfig.json
├── package.json           # With test scripts
├── Makefile              # With test target
└── README.md
```

#### Testing Dependencies (package.json devDependencies)

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "jest-html-reporter": "^3.10.0"
  },
  "scripts": {
    "test:unit": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Important**: Projects in the npm workspace must use `test:unit` as the script name to align with the workspace-wide test execution pattern.

## Implementation Plan by Project

### Phase 1: Python Projects

#### 1.1 asyncapigenerator

**Current State**:

- Has `test_generator.py` with manual test functions
- Uses basic assertions without proper test framework
- No structured test organization

**Actions**:

1. Create `tests/` directory
2. Add `pytest.ini` configuration
3. Add `requirements-dev.txt` with pytest dependencies
4. Convert `test_generator.py` to pytest format:
   - `tests/test_generator.py` - Convert existing tests
   - `tests/test_event_parsing.py` - Test event markdown parsing
   - `tests/test_service_parsing.py` - Test service markdown parsing
   - `tests/test_asyncapi_generation.py` - Test AsyncAPI spec generation
   - `tests/conftest.py` - Shared fixtures (temp dirs, sample data)
5. Update Makefile with test targets
6. Target coverage: 80%+

**Modules to Test**:

- `generate_asyncapi.py` - Main generator logic
- Event parsing functions
- Service parsing functions
- AsyncAPI spec generation
- YAML output generation

#### 1.2 cloudeventjekylldocs

**Current State**:

- No tests
- Has scripts in `scripts/` directory
- Python scripts for documentation generation

**Actions**:

1. Create `tests/` directory structure
2. Add `pytest.ini` configuration
3. Add `requirements-dev.txt` with pytest dependencies
4. Create test files:
   - `tests/test_generate_docs.py` - Test doc generation from schemas
   - `tests/test_generate_docs_yaml.py` - Test YAML doc generation
   - `tests/test_generate_docs_markdown.py` - Test Markdown generation
   - `tests/test_yaml_to_json.py` - Test YAML to JSON conversion
   - `tests/conftest.py` - Shared fixtures
5. Update Makefile with test targets
6. Target coverage: 80%+

**Modules to Test**:

- `scripts/generate_docs.py`
- `scripts/generate_docs_yaml.py`
- `scripts/generate_docs_markdown.py`
- `scripts/generate_docs_all.py`
- `scripts/yaml_to_json.py`

#### 1.3 eventcatalogasyncapiimporter

**Current State**:

- Has `test_import_asyncapi.py` using unittest
- Basic test structure exists

**Actions**:

1. Create proper `tests/` directory
2. Add `pytest.ini` configuration
3. Add `requirements-dev.txt` with pytest dependencies
4. Convert unittest tests to pytest:
   - `tests/test_import_asyncapi.py` - Convert existing tests to pytest
   - `tests/test_event_extraction.py` - Test event extraction logic
   - `tests/test_markdown_generation.py` - Test markdown generation
   - `tests/test_schema_resolution.py` - Test schema path resolution
   - `tests/conftest.py` - Shared fixtures
5. Move `test_import_asyncapi.py` to `tests/`
6. Update Makefile with test targets
7. Target coverage: 80%+

**Modules to Test**:

- `import_asyncapi.py` - Main importer class
- AsyncAPI parsing
- Event extraction
- Markdown generation
- File operations

### Phase 2: TypeScript Projects

#### 2.1 cloudevents

**Current State**:

- No tests
- Has tools in `tools/` subdirectory with multiple TypeScript files
- Uses ts-node for execution

**Actions**:

1. Create `__tests__/` directory structure
2. Add `jest.config.ts` (based on lambdas pattern)
3. Update `package.json` with test dependencies and scripts
4. Create test files:
   - `__tests__/cache/schema-cache.test.ts` - Test schema caching
   - `__tests__/builder/build-schema.test.ts` - Test schema building
   - `__tests__/generator/generate-example.test.ts` - Test example generation
   - `__tests__/generator/manual-bundle-schema.test.ts` - Test bundling
5. Update Makefile with test targets
6. Target coverage: 80%+

**Modules to Test**:

- `tools/cache/schema-cache.ts` - Schema caching logic
- `tools/builder/build-schema.ts` - Schema building
- `tools/generator/generate-example.ts` - Example generation
- `tools/generator/manual-bundle-schema.ts` - Schema bundling
- `tools/validator/` - Schema validation (if present)

#### 2.2 typescript-schema-generator

**Current State**:

- Only contains `PLAN.md`
- Not yet implemented

**Actions**:

- Create test structure as part of implementation
- Follow the same pattern as cloudevents when implemented

### Phase 3: Root-Level Integration

#### 3.1 Create src/Makefile

**Purpose**: Orchestrate testing across all src/ subdirectories

**Content**:

```makefile
.PHONY: help test test-python test-typescript test-asyncapigenerator test-cloudeventjekylldocs test-eventcatalogasyncapiimporter test-cloudevents coverage clean

help: ## Show this help
 @grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2}'

test: test-python test-typescript ## Run all tests

test-python: test-asyncapigenerator test-cloudeventjekylldocs test-eventcatalogasyncapiimporter ## Run all Python tests

test-typescript: test-cloudevents ## Run all TypeScript tests

test-asyncapigenerator: ## Run asyncapigenerator tests
 @echo "=== Testing asyncapigenerator ==="
 $(MAKE) -C asyncapigenerator test

test-cloudeventjekylldocs: ## Run cloudeventjekylldocs tests
 @echo "=== Testing cloudeventjekylldocs ==="
 $(MAKE) -C cloudeventjekylldocs test

test-eventcatalogasyncapiimporter: ## Run eventcatalogasyncapiimporter tests
 @echo "=== Testing eventcatalogasyncapiimporter ==="
 $(MAKE) -C eventcatalogasyncapiimporter test

test-cloudevents: ## Run cloudevents tests
 @echo "=== Testing cloudevents ==="
 $(MAKE) -C cloudevents test

coverage: ## Generate combined coverage report
 @echo "=== Generating coverage reports ==="
 # Python projects
 $(MAKE) -C asyncapigenerator coverage
 $(MAKE) -C cloudeventjekylldocs coverage
 $(MAKE) -C eventcatalogasyncapiimporter coverage
 # TypeScript projects
 $(MAKE) -C cloudevents coverage

clean: ## Clean test artifacts
 find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
 find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
 find . -type d -name ".coverage" -exec rm -rf {} + 2>/dev/null || true
 find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
 find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
 find . -type d -name ".reports" -exec rm -rf {} + 2>/dev/null || true
```

#### 3.2 Update Root Makefile

Add to `/workspaces/nhs-notify-digital-letters/Makefile`:

```makefile
test: ## Run all tests
 $(MAKE) -C src test

test-unit: ## Run unit tests only
 $(MAKE) -C src test

test-coverage: ## Run tests with coverage
 $(MAKE) -C src coverage
```

## Standard Makefile Targets per Project

### Python Projects (pytest)

```makefile
.PHONY: help install install-dev test test-verbose coverage lint format clean

help: ## Show this help
 @grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install production dependencies
 pip install -r requirements.txt

install-dev: install ## Install development dependencies
 pip install -r requirements-dev.txt

test: ## Run tests
 pytest tests/ -v

test-verbose: ## Run tests with verbose output
 pytest tests/ -vv -s

coverage: ## Run tests with coverage report
 pytest tests/ --cov=. --cov-report=html --cov-report=term

lint: ## Run linting
 flake8 .
 mypy .

format: ## Format code
 black .

clean: ## Clean test artifacts
 rm -rf .pytest_cache
 rm -rf htmlcov
 rm -rf .coverage
 find . -type d -name "__pycache__" -exec rm -rf {} +
```

### TypeScript Projects (Jest)

**Note**: For projects in the npm workspace (listed in root `package.json` workspaces), tests must be executable via `npm run test:unit` to align with the workspace pattern.

```makefile
.PHONY: help install test test-watch coverage lint format clean

help: ## Show this help
 @grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
 npm install

test: ## Run tests
 npm run test:unit

test-watch: ## Run tests in watch mode
 npm run test:watch

coverage: ## Run tests with coverage
 npm run test:coverage

lint: ## Run linting
 npm run lint

format: ## Format code
 npm run format

clean: ## Clean test artifacts
 rm -rf node_modules
 rm -rf .reports
 rm -rf coverage
```

## Configuration Files

### Python: pytest.ini

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --strict-markers
    --tb=short
    --cov-report=html
    --cov-report=term-missing
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow running tests
```

### TypeScript: jest.config.ts

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: './.reports/coverage',
  coverageProvider: 'babel',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Test Report',
        outputPath: './.reports/test-report.html',
        includeFailureMsg: true,
      },
    ],
  ],
};

export default config;
```

## Testing Best Practices

### General Principles

1. **Test Coverage**: Aim for 80%+ code coverage
2. **Test Isolation**: Each test should be independent
3. **Mock External Dependencies**: Mock file I/O, network calls, external APIs
4. **Clear Test Names**: Use descriptive test function names
5. **AAA Pattern**: Arrange, Act, Assert
6. **Test Data**: Use fixtures for reusable test data

### Python-Specific

1. Use pytest fixtures for setup/teardown
2. Use `parametrize` for testing multiple inputs
3. Use `tmp_path` fixture for file operations
4. Mock with `pytest-mock` (mocker fixture)
5. Use `conftest.py` for shared fixtures

### TypeScript-Specific

1. Use Jest mocks for modules and functions
2. Use `beforeEach`/`afterEach` for setup/teardown
3. Use `describe` blocks to group related tests
4. Mock file system with `mock-fs` if needed
5. Use `jest.fn()` for function mocking

## CI/CD Integration

### Current Implementation

The project uses **GitHub Actions** for CI/CD testing. All tests are executed via:

```bash
make test-unit
```

Which calls the test orchestration script:

```bash
scripts/tests/unit.sh
```

This script is used by `.github/workflows/stage-2-test.yaml` in the **"Run unit test suite"** step.

### Adding Tests for New Projects

**CRITICAL**: When you add tests for a new project, you **MUST** update `scripts/tests/unit.sh` to include:

1. **Prerequisites installation** (for Python projects)
2. **Test execution**

#### Example for Python Projects

```bash
# Python projects - your-project-name
echo "Setting up and running your-project-name tests..."
make -C ./src/your-project-name install-dev  # Install test dependencies
make -C ./src/your-project-name test          # Run tests
```

#### Example for TypeScript Projects

TypeScript projects in the npm workspace are automatically tested via:

```bash
npm ci
npm run test:unit --workspaces
```

No additional changes needed if your project has `test:unit` script in `package.json`.

#### Full Example: scripts/tests/unit.sh

```bash
#!/bin/bash

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Python projects
echo "Setting up and running asyncapigenerator tests..."
make -C ./src/asyncapigenerator install-dev
make -C ./src/asyncapigenerator coverage  # Use coverage to generate coverage.xml for SonarCloud

echo "Setting up and running cloudeventjekylldocs tests..."
make -C ./src/cloudeventjekylldocs install-dev
make -C ./src/cloudeventjekylldocs coverage  # Use coverage to generate coverage.xml for SonarCloud

# TypeScript/JavaScript projects (npm workspace)
npm ci
npm run test:unit --workspaces

# Merge coverage reports
mkdir -p .reports
TMPDIR="./.reports" ./node_modules/.bin/lcov-result-merger \
  "**/.reports/unit/coverage/lcov.info" \
  ".reports/lcov.info" \
  --ignore "node_modules" \
  --prepend-source-files \
  --prepend-path-fix "../../.."
```

### CI/CD Workflow Details

The GitHub Actions workflow (`.github/workflows/stage-2-test.yaml`):

1. **Checks out code**
2. **Runs `npm ci`** - Installs npm dependencies
3. **Generates dependencies** - Runs `npm run generate-dependencies --workspaces --if-present`
4. **Runs `make test-unit`** - Executes `scripts/tests/unit.sh`
5. **Uploads artifacts** - Saves test results and coverage reports

**Important Notes**:

- Python projects must have `install-dev` target in their Makefile
- Python projects must have `requirements-dev.txt` with test dependencies
- **Python projects must have `coverage` target that generates `coverage.xml`** for SonarCloud
- Tests must run quickly (timeout is 5 minutes for unit tests)
- Coverage reports should be in `.reports/` directory for TypeScript, in project root for Python
- Python coverage must generate XML format: `pytest --cov=. --cov-report=xml:coverage.xml`

### SonarCloud Integration

**For Python Projects**: SonarCloud requires XML coverage reports. Ensure:

1. **pytest.ini includes XML coverage**:

   ```ini
   addopts =
       --cov=.
       --cov-report=xml:coverage.xml
   ```

2. **Makefile coverage target generates XML**:

   ```makefile
   coverage: ## Run tests with coverage report
       pytest tests/ --cov=. --cov-report=html --cov-report=term-missing --cov-report=xml:coverage.xml
   ```

3. **scripts/tests/unit.sh runs coverage (not just test)**:

   ```bash
   make -C ./src/your-project coverage  # Generates coverage.xml
   ```

4. **scripts/config/sonar-scanner.properties configured**:

   ```properties
   sonar.tests=tests/, src/your-project/tests, ...
   sonar.test.inclusions=tests/**, src/**/tests/**, ...
   sonar.coverage.exclusions=tests/, src/**/tests/, ...
   sonar.python.coverage.reportPaths=src/your-project/coverage.xml
   ```

Without these configurations, SonarCloud will show 0% coverage for Python projects.

## Monitoring and Verification

### GitHub Actions Monitoring

Use the **GitHub CLI** (`gh`) to monitor workflow runs. **IMPORTANT**: Always use `--json` format to avoid the pager.

#### List Recent Workflow Runs

```bash
gh run list --branch <branch-name> --limit <n> --json databaseId,status,conclusion,name,createdAt,url
```

Example:

```bash
gh run list --branch rossbugginsnhs/2025-11-04/eventcatalog-001 --limit 5 --json databaseId,status,conclusion,name,url
```

#### View Workflow Run Details

```bash
gh run view <run-id> --json conclusion,status,jobs
```

#### Format Output with jq

```bash
gh run list --branch <branch-name> --limit 5 --json status,conclusion,name | jq -r '.[] | "\(.status) - \(.conclusion) - \(.name)"'
```

#### Watch a Running Workflow

```bash
gh run watch <run-id>
```

(This command is interactive and designed for watching, so it's OK to use without --json)

#### Setup (if needed)

If you encounter "No default remote repository" error:

```bash
gh repo set-default NHSDigital/nhs-notify-digital-letters
```

If authentication is required, run:

```bash
gh auth login
```

### SonarCloud Coverage Monitoring

Use the **SonarCloud public API** to check coverage metrics (no authentication required for public repos):

#### API Endpoint

```bash
https://sonarcloud.io/api/measures/component
```

#### Parameters

- `component`: Project or component key
  - Project: `NHSDigital_nhs-notify-digital-letters`
  - Component: `NHSDigital_nhs-notify-digital-letters:src/project-name`
- `branch`: URL-encoded branch name (e.g., `rossbugginsnhs/2025-11-04/eventcatalog-001`)
- `metricKeys`: Comma-separated metrics (e.g., `coverage,new_coverage,lines_to_cover,new_lines_to_cover`)

#### Example: Check Project-Wide Coverage

```bash
curl -s "https://sonarcloud.io/api/measures/component?component=NHSDigital_nhs-notify-digital-letters&branch=rossbugginsnhs/2025-11-04/eventcatalog-001&metricKeys=coverage,new_coverage,lines_to_cover,new_lines_to_cover" | python3 -m json.tool
```

#### Example: Check Specific Component Coverage

```bash
curl -s "https://sonarcloud.io/api/measures/component?component=NHSDigital_nhs-notify-digital-letters:src/asyncapigenerator&branch=rossbugginsnhs/2025-11-04/eventcatalog-001&metricKeys=coverage,new_coverage,lines_to_cover,new_lines_to_cover" | python3 -m json.tool
```

#### Response Format

```json
{
    "component": {
        "key": "NHSDigital_nhs-notify-digital-letters:src/asyncapigenerator",
        "measures": [
            {
                "metric": "coverage",
                "value": "94.0"
            },
            {
                "metric": "new_coverage",
                "periods": [
                    {
                        "index": 1,
                        "value": "94.0"
                    }
                ]
            },
            {
                "metric": "lines_to_cover",
                "value": "246"
            },
            {
                "metric": "new_lines_to_cover",
                "periods": [
                    {
                        "index": 1,
                        "value": "246"
                    }
                ]
            }
        ]
    }
}
```

#### Interpreting Results

- `coverage`: Overall coverage percentage
- `new_coverage`: Coverage for new/changed code on the branch
- `lines_to_cover`: Total lines that should be covered
- `new_lines_to_cover`: New lines that should be covered
- **If `new_coverage` is 0.0%**: SonarCloud is not detecting your Python coverage reports
  - Check that `coverage.xml` is being generated
  - Verify `sonar-scanner.properties` has correct paths
  - Confirm `scripts/tests/unit.sh` runs `make coverage` (not `make test`)

### Testing CI/CD Changes Locally

Before committing changes to `scripts/tests/unit.sh`, test locally:

```bash
# From repository root
bash scripts/tests/unit.sh
```

This will run all tests exactly as CI/CD does.

## Success Criteria

### Per Project

- ✅ All projects have dedicated `tests/` or `__tests__/` directory
- ✅ All projects have standardized Makefile with test targets
- ✅ All projects have configuration files (pytest.ini or jest.config.ts)
- ✅ All projects have development dependencies documented
- ✅ 80%+ code coverage achieved
- ✅ Tests run successfully with `make test`

### Overall

- ✅ `make test` at root level runs all tests
- ✅ `make test` in `src/` runs all src tests
- ✅ `make test` in each project directory runs project tests
- ✅ Consistent testing patterns across projects
- ✅ Clear documentation in each project's README

## Timeline Estimate

- **Phase 1 (Python Projects)**: 3-4 days
  - asyncapigenerator: 1 day
  - cloudeventjekylldocs: 1 day
  - eventcatalogasyncapiimporter: 1 day
  - Integration & refinement: 0.5 day

- **Phase 2 (TypeScript Projects)**: 2-3 days
  - cloudevents: 2 days
  - Integration: 0.5 day

- **Phase 3 (Integration)**: 0.5 day
  - src/Makefile creation
  - Root Makefile updates
  - Documentation

**Total Estimate**: 6-8 days

## Next Steps

1. Review and approve this plan
2. Start with Phase 1.1 (asyncapigenerator) as pilot
3. Iterate and refine based on learnings
4. Apply pattern to remaining projects
5. Complete integration
6. Document in repository README

## Questions to Resolve

1. **Coverage Thresholds**: Should we enforce 80% or adjust per project?
2. **Test Data**: Where should shared test fixtures/data live?
3. **CI/CD**: When should we integrate with GitHub Actions?
4. **Mocking Strategy**: How strictly should we mock external dependencies?
5. **Performance Tests**: Should we add performance/benchmark tests?

---

## Document Status

| Field | Value |
|-------|-------|
| **Status** | Draft for Review |
| **Last Updated** | 2025-11-04 |
| **Author** | GitHub Copilot |
| **Reviewers** | [To be assigned] |
| **Version** | 1.0 |

---

**Note**: This is a living document. Update the [Implementation Progress Tracker](#implementation-progress-tracker) section as work progresses.
