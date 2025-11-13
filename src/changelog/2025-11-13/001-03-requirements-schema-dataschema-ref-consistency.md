# Requirements: Schema Consistency Validation

**Date**: 2025-11-13 14:50 GMT
**Branch**: rossbugginsnhs/2025-11-13/schema-restrictions
**Related Documents**:

- [001-01-request-schema-dataschema-ref-consistency.md](./001-01-request-schema-dataschema-ref-consistency.md)
- [001-02-plan-schema-dataschema-ref-consistency.md](./001-02-plan-schema-dataschema-ref-consistency.md)

## Functional Requirements

### FR1: Schema Validation Function

**ID**: FR1
**Priority**: MUST
**Description**: The system must provide a function to validate that `dataschema` const values match `data` $ref values in CloudEvents event schemas.

**Acceptance Criteria**:

- Function accepts a parsed schema object as input
- Function returns a result object indicating success or failure
- Function extracts `properties.dataschema.const` value
- Function extracts `properties.data.$ref` value
- Function compares both values for exact string match
- Function returns detailed error information on mismatch

### FR2: Batch Validation Script

**ID**: FR2
**Priority**: MUST
**Description**: The system must provide a standalone script to validate multiple event schema files.

**Acceptance Criteria**:

- Script accepts directory path(s) as input
- Script recursively finds all `.schema.yaml` and `.schema.json` files in events directories
- Script validates each schema using the validation function
- Script reports all validation failures with file paths
- Script exits with code 0 if all validations pass
- Script exits with non-zero code if any validation fails

### FR3: Clear Error Reporting

**ID**: FR3
**Priority**: MUST
**Description**: Validation failures must provide clear, actionable error messages.

**Acceptance Criteria**:

- Error messages include the schema file path
- Error messages show the mismatched values (expected vs actual)
- Error messages explain what needs to be corrected
- Error messages are formatted for easy reading in terminal output

### FR4: Skip Non-Applicable Schemas

**ID**: FR4
**Priority**: MUST
**Description**: The validator must skip schemas that don't have the dataschema/data pattern.

**Acceptance Criteria**:

- Schemas without `properties.dataschema` are skipped without error
- Schemas without `properties.data` are skipped without error
- Skipped schemas do not count as validation failures
- Optional: Report count of skipped schemas for transparency

### FR5: Make/npm Integration

**ID**: FR5
**Priority**: MUST
**Description**: The validation must be executable via standard project commands.

**Acceptance Criteria**:

- Can run via `make validate-dataschema-consistency`
- Can run via `npm run validate:dataschema-consistency`
- Commands run from project root work correctly
- Commands display validation results to console

### FR6: CI/CD Integration

**ID**: FR6
**Priority**: SHOULD
**Description**: The validation should be integrated into the CI/CD pipeline.

**Acceptance Criteria**:

- Validation runs automatically on pull requests
- Validation runs on commits to main branch
- Pipeline fails if validation fails
- Validation results are visible in GitHub Actions logs

## Non-Functional Requirements

### NFR1: Performance

**ID**: NFR1
**Priority**: MUST
**Description**: Validation must complete in reasonable time for CI/CD usage.

**Acceptance Criteria**:

- Validation of all ~22 event schemas completes in < 5 seconds
- Memory usage remains under 500MB
- Validation is able to be parallel if needed for performance

### NFR2: Reliability

**ID**: NFR2
**Priority**: MUST
**Description**: Validation must be deterministic and reliable.

**Acceptance Criteria**:

- Same schema always produces same validation result
- No false positives (valid schemas never reported as invalid)
- No false negatives (invalid schemas never reported as valid)
- Validation handles edge cases gracefully (null, undefined, missing properties)

### NFR3: Maintainability

**ID**: NFR3
**Priority**: MUST
**Description**: Code must be maintainable and testable.

**Acceptance Criteria**:

- Functions are pure and testable in isolation
- Code follows existing project TypeScript conventions
- Unit test coverage is 100% for new validation functions
- Code includes JSDoc comments explaining purpose and parameters

### NFR4: Compatibility

**ID**: NFR4
**Priority**: MUST
**Description**: Validation must work with existing project infrastructure.

**Acceptance Criteria**:

- Works with existing YAML and JSON schema parsers
- Compatible with existing TypeScript version
- Integrates with existing test framework (Jest/Vitest)
- Follows existing validator patterns and conventions

### NFR5: Extensibility

**ID**: NFR5
**Priority**: SHOULD
**Description**: Validation logic should be extensible for future schema checks.

**Acceptance Criteria**:

- Validation function is modular and reusable
- Easy to add additional schema consistency checks
- Clear separation between parsing, validation, and reporting logic

### NFR6: Usability

**ID**: NFR6
**Priority**: SHOULD
**Description**: Validation must be easy to use for developers.

**Acceptance Criteria**:

- Clear command-line interface with help text
- Examples in documentation
- Sensible defaults (validates all schemas if no path specified)
- Colored output for better readability (pass/fail)

## Constraints

### C1: Technology Stack

- Must use existing TypeScript codebase
- Must use existing YAML parser (`js-yaml`)
- Must integrate with existing AJV validator infrastructure

### C2: Backward Compatibility

- Must not break existing validator functionality
- Must not change existing schema files
- Must not require schema file format changes

### C3: Standards Compliance

- Must follow CloudEvents specification
- Must follow JSON Schema specification
- Must follow existing project coding standards

## Dependencies

### D1: Existing Tools

- Depends on `js-yaml` for YAML parsing
- Depends on existing validator-lib.ts functions
- Depends on TypeScript compiler and tooling

### D2: Schema Structure

- Assumes CloudEvents envelope schema structure
- Assumes `properties.dataschema` contains `const` value
- Assumes `properties.data` contains `$ref` value

## Success Metrics

- All 22+ existing event schemas pass validation
- Zero false positives in CI/CD runs over 1 week
- Validation catches intentional mismatches in test cases
- Developer feedback is positive on usability
