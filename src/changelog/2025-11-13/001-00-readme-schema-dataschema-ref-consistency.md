# Schema Dataschema Consistency Validation

**Status**: 🚧 In Development
**Last Updated**: 2025-11-13 15:20 GMT

## What It Does

This validation tool ensures consistency in CloudEvents event schemas by checking that the `dataschema` const value matches the `data` $ref value.

In CloudEvents schemas, these two properties should always reference the same schema file:

```yaml
dataschema:
  type: string
  const: ../data/digital-letter-base-data.schema.yaml  # Must match
data:
  $ref: ../data/digital-letter-base-data.schema.yaml   # Must match
```

The validator automatically detects mismatches and reports them clearly.

## Why It Matters

Mismatched `dataschema` and `data` references can cause:

- Runtime validation failures
- Confusing error messages
- Incorrect schema documentation
- Integration issues with event consumers

This validation catches these issues early in development.

## Quick Start

### Validate Your Schemas

```bash
# Validate all event schemas in current directory
npm run validate:dataschema-consistency

# Or use make
make validate-dataschema-consistency

# Validate specific directory
npm run validate:dataschema-consistency -- /path/to/schemas
```

### Expected Output

**When all schemas are valid**:

```plaintext
✓ Validating event schemas...
✓ Found 22 schema files
✓ All schemas valid - no mismatches detected
```

**When mismatches are found**:

```plaintext
✗ Validation failed for 2 schemas:

  File: uk.nhs.notify.digital.letters.event.v1.schema.yaml
  Error: dataschema const does not match data $ref
    Expected: ../data/schema-a.yaml
    Actual:   ../data/schema-b.yaml

  File: another-event.v1.schema.yaml
  Error: dataschema const does not match data $ref
    Expected: ../data/correct-schema.yaml
    Actual:   ../data/wrong-schema.yaml

✗ 2 validation errors found
```

## Usage

### In Development

Run validation before committing schema changes:

```bash
# Add to your workflow
git add src/cloudevents/domains/*/events/*.yaml
make validate-dataschema-consistency
git commit -m "feat: add new event schema"
```

### In CI/CD

The validation runs automatically in the CI/CD pipeline:

- **Pull Requests**: Validates all schema files
- **Main Branch**: Runs on every commit
- **Failure**: Pipeline fails if mismatches detected

### Programmatic Use

Use the validation function directly in your code:

```typescript
import { validateDataschemaConsistency } from './validator-lib';

const schema = {
  properties: {
    dataschema: {
      const: '../data/schema.yaml'
    },
    data: {
      $ref: '../data/schema.yaml'
    }
  }
};

const result = validateDataschemaConsistency(schema);

if (!result.valid) {
  console.error(result.errorMessage);
  console.log(`Expected: ${result.dataschemaValue}`);
  console.log(`Actual: ${result.dataRefValue}`);
}
```

## What Gets Validated

### Validated Schemas

The tool checks schemas that have BOTH:

- A `properties.dataschema.const` value
- A `properties.data.$ref` value

### Skipped Schemas

Schemas are automatically skipped (no error) if they:

- Don't have a `dataschema` property
- Don't have a `data` property
- Are not CloudEvents event schemas

### Validation Rules

1. **Exact Match**: Values must match exactly (case-sensitive)
2. **No Whitespace**: Trailing/leading spaces cause validation failure
3. **String Only**: Both values must be strings
4. **Not Null**: Null or undefined values fail validation

## Common Issues

### Mismatch Detected

**Problem**: Validator reports mismatch

**Solution**: Update schema to use consistent reference:

```yaml
# Before (incorrect)
dataschema:
  const: ../data/old-schema.yaml
data:
  $ref: ../data/new-schema.yaml

# After (correct)
dataschema:
  const: ../data/new-schema.yaml
data:
  $ref: ../data/new-schema.yaml
```

### Case Sensitivity

**Problem**: `Schema.yaml` vs `schema.yaml`

**Solution**: Ensure exact case match:

```yaml
# Both must use same case
dataschema:
  const: ../data/Schema.yaml  # Capital S
data:
  $ref: ../data/Schema.yaml   # Capital S
```

### Whitespace Issues

**Problem**: Hidden spaces cause validation failure

**Solution**: Remove trailing whitespace:

```yaml
# Before (incorrect - space after .yaml)
dataschema:
  const: ../data/schema.yaml

# After (correct)
dataschema:
  const: ../data/schema.yaml
```

## Where to Get Help

- **Documentation**: See `/src/changelog/2025-11-13/001-01-request-*.md` for background
- **Requirements**: See `/src/changelog/2025-11-13/001-03-requirements-*.md` for detailed specs
- **Issues**: Report problems in GitHub Issues
- **Questions**: Ask in team channels

## Development Status

### Current Status: 🚧 In Development

- ✅ Validation logic implemented and tested
- ⏳ CLI script in progress
- ⏳ CI/CD integration pending
- ⏳ Documentation being refined

### Upcoming

- Full CI/CD pipeline integration
- Additional validation rules if needed
- Performance optimizations
- Enhanced error messages

---

**Note**: This document will be updated as the feature develops. Check the "Last Updated" timestamp above.
