# Implementation Plan: Schema Consistency Validation

**Date**: 2025-11-13 14:38 GMT
**Branch**: rossbugginsnhs/2025-11-13/schema-restrictions
**Related Request**: [001-01-request-schema-dataschema-ref-consistency.md](./001-01-request-schema-dataschema-ref-consistency.md)## Overview

Add validation to ensure that in CloudEvents event schemas, the `dataschema` const value matches the `data` $ref value.

## Implementation Steps

### 1. Create New Validation Library

Create a new library file `dataschema-consistency-lib.ts` with validation function:

- Export `validateDataschemaConsistency(schemaObject)` function
- Export `DataschemaConsistencyResult` interface type
- Checks if the schema has both `properties.dataschema.const` and `properties.data.$ref`
- Returns validation result with details if they don't match
- Returns success if they match or if the pattern doesn't apply

**Location**: `src/cloudevents/tools/validator/dataschema-consistency-lib.ts`

**Rationale**: Create new file instead of modifying existing validator-lib.ts to keep changes isolated and avoid impacting existing validation functionality.

### 2. Create Standalone Validation Script

Create a script that:

- Scans all event schema files in specified directories
- Validates each schema for dataschema/data consistency
- Reports all inconsistencies
- Exits with error code if any inconsistencies found
- Imports from the new dataschema-consistency-lib.ts

**Location**: `src/cloudevents/tools/validator/validate-dataschema-consistency.ts`

### 3. Add Unit Tests

Create comprehensive tests for:

- Matching dataschema and data values (should pass)
- Mismatched values (should fail with clear message)
- Schemas without dataschema property (should skip)
- Schemas without data property (should skip)
- Edge cases (null, undefined, different path formats)

**Location**: `src/cloudevents/tools/validator/__tests__/validate-dataschema-consistency.test.ts`

**Note**: Tests will import from `dataschema-consistency-lib` (new file), not from existing validator-lib.

### 4. Update Makefile

Add a new make target to run the consistency validation:

```makefile
validate-dataschema-consistency:
    npm run validate:dataschema-consistency
```

**Location**: `src/cloudevents/Makefile`

### 5. Update package.json

Add script to run the consistency validator:

```json
"validate:dataschema-consistency": "tsx tools/validator/validate-dataschema-consistency.ts"
```

**Location**: `src/cloudevents/package.json`

### 6. Integrate into CI/CD Pipeline

Add validation step to the existing validation workflow or create new step.

**Location**: `.github/workflows/` or relevant CI/CD configuration

## Success Criteria

- [ ] Validation function correctly identifies matching dataschema/data pairs
- [ ] Validation function correctly identifies mismatches with helpful error messages
- [ ] All 22+ existing event schemas pass validation
- [ ] Unit tests achieve 100% code coverage for new functions
- [ ] Script can be run standalone via `make` or `npm run`
- [ ] Integration into CI/CD prevents merging schemas with inconsistencies
- [ ] Documentation updated if needed

## Testing Strategy

1. Run against all existing event schemas to ensure they currently pass
2. Create test schemas with intentional mismatches to verify detection
3. Test edge cases (missing properties, null values, etc.)
4. Verify error messages are clear and actionable

## Rollout Plan

1. Implement and test locally
2. Run against all existing schemas to verify current state
3. Add to CI/CD pipeline as warning initially
4. Monitor for false positives
5. Convert to blocking validation once confident
