# Schema Consistency Validation Enhancement

**Date**: 2025-11-13 14:31 GMT
**Branch**: rossbugginsnhs/2025-11-13/schema-restrictions

## Objective

Enhance the CloudEvents validator at `src/cloudevents/tools/validator` to enforce consistency between `dataschema` const values and `data` $ref values across all event schemas.

### Current Pattern in Event Schemas

All event schemas follow this pattern:

```yaml
dataschema:
  type: string
  const: ../data/digital-letter-base-data.schema.yaml
  description: Canonical URI of the example event's data schema.
data:
  $ref: ../data/digital-letter-base-data.schema.yaml
  description: Example payload wrapper containing notify-payload.
```

### Challenge

- `dataschema.const` is a literal value that validates instance data
- `data.$ref` is schema metadata that tells validators which schema to use
- JSON Schema has no built-in way to cross-reference between literal values and schema keywords

### Proposed Solution

Add validation to the existing validator tool at `src/cloudevents/tools/validator` to:

1. Parse event schema files
2. Extract the `dataschema.const` value
3. Extract the `data.$ref` value
4. Fail validation if they don't match

This would be integrated into the existing validation tooling and CI/CD pipeline to ensure consistency across all 22+ event schemas that follow this pattern.

## Next Steps

1. Create a validation function in `validator-lib.ts`
2. Add a standalone validation script or extend existing validator
3. Add tests for the new validation
4. Integrate into CI/CD pipeline
