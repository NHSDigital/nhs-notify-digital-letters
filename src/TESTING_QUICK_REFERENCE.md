# Testing Quick Reference Guide

<!-- markdownlint-disable MD013 -->

This is a condensed reference guide for the [full testing plan](./TESTING_PLAN.md).

## Quick Commands

### Run All Tests

```bash
# From repository root
make test

# From src/ directory
cd src && make test
```

### Run Tests for Specific Project

```bash
# Python projects
cd src/asyncapigenerator && make test
cd src/cloudeventjekylldocs && make test
cd src/eventcatalogasyncapiimporter && make test

# TypeScript projects
cd src/cloudevents && make test
```

### Generate Coverage Reports

```bash
# All projects
make test-coverage

# Specific project (Python)
cd src/asyncapigenerator && make coverage

# Specific project (TypeScript)
cd src/cloudevents && make coverage
```

## Project Status

| Project | Type | Status | Coverage |
|---------|------|--------|----------|
| asyncapigenerator | Python | ❌ Not Started | - |
| cloudeventjekylldocs | Python | ❌ Not Started | - |
| eventcatalogasyncapiimporter | Python | ❌ Not Started | - |
| cloudevents | TypeScript | ❌ Not Started | - |

## Standard File Structure

### Python Project

```plain
project-name/
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── test_*.py
├── pytest.ini
├── requirements-dev.txt
└── Makefile
```

### TypeScript Project

```plain
project-name/
├── __tests__/
│   └── *.test.ts
├── jest.config.ts
├── package.json (with test deps)
└── Makefile
```

## Implementation Order

1. ✅ **asyncapigenerator** (Python) - Pilot project
2. ⏸️ **cloudeventjekylldocs** (Python)
3. ⏸️ **eventcatalogasyncapiimporter** (Python)
4. ⏸️ **cloudevents** (TypeScript)
5. ⏸️ **Integration** (Makefiles)

## Key Files to Create

### Per Python Project

- [ ] `tests/` directory
- [ ] `tests/conftest.py`
- [ ] `pytest.ini`
- [ ] `requirements-dev.txt`
- [ ] Update `Makefile`

### Per TypeScript Project

- [ ] `__tests__/` directory
- [ ] `jest.config.ts`
- [ ] Update `package.json`
- [ ] Update `Makefile`

### Root Level

- [ ] `src/Makefile`
- [ ] Update `/Makefile`

## Links

- [Full Testing Plan](./TESTING_PLAN.md)
- [Implementation Progress Tracker](./TESTING_PLAN.md#implementation-progress-tracker)
- [Configuration Examples](./TESTING_PLAN.md#configuration-files)
- [Best Practices](./TESTING_PLAN.md#testing-best-practices)

---

**Last Updated**: 2025-11-04
