# Testing Strategy: Schema Consistency Validation

**Date**: 2025-11-13 15:06 GMT
**Branch**: rossbugginsnhs/2025-11-13/schema-restrictions
**Approach**: Test-Driven Development (TDD)
**Related Documents**:

- [001-01-request-schema-dataschema-ref-consistency.md](./001-01-request-schema-dataschema-ref-consistency.md)
- [001-02-plan-schema-dataschema-ref-consistency.md](./001-02-plan-schema-dataschema-ref-consistency.md)
- [001-03-requirements-schema-dataschema-ref-consistency.md](./001-03-requirements-schema-dataschema-ref-consistency.md)

## TDD Approach

Following strict TDD principles:

1. **RED**: Write failing tests first
2. **GREEN**: Implement minimal code to pass tests
3. **REFACTOR**: Improve code while keeping tests green

All tests must be written and executable (failing) before any implementation logic is added.

## Test File Structure

### Test File Location

`src/cloudevents/tools/validator/__tests__/validate-dataschema-consistency.test.ts`

### Skeleton Implementation Files

Before writing tests, create these skeleton files:

1. **dataschema-consistency-lib.ts** - New library file with function stub and type:

   ```typescript
   /**
    * Result of dataschema consistency validation
    */
   export interface DataschemaConsistencyResult {
     valid: boolean;
     schemaPath?: string;
     dataschemaValue?: string;
     dataRefValue?: string;
     errorMessage?: string;
   }

   /**
    * Validate that dataschema const value matches data $ref value
    */
   export function validateDataschemaConsistency(schema: any): DataschemaConsistencyResult {
     throw new Error('Not implemented');
   }
   ```

   **Location**: `src/cloudevents/tools/validator/dataschema-consistency-lib.ts`

   **Rationale**: Create new standalone library file instead of modifying existing validator-lib.ts to keep validation logic isolated and avoid impacting existing functionality.

## Unit Tests for validateDataschemaConsistency Function

### Test Suite 1: Valid Schemas (Should Pass)

#### Test 1.1: Matching dataschema and data values

```typescript
describe('validateDataschemaConsistency', () => {
  it('should return valid=true when dataschema const matches data $ref', () => {
    const schema = {
      properties: {
        dataschema: {
          type: 'string',
          const: '../data/digital-letter-base-data.schema.yaml'
        },
        data: {
          $ref: '../data/digital-letter-base-data.schema.yaml'
        }
      }
    };

    const result = validateDataschemaConsistency(schema);

    expect(result.valid).toBe(true);
    expect(result.errorMessage).toBeUndefined();
  });
});
```

#### Test 1.2: Different but valid matching paths

```typescript
it('should return valid=true for different path formats when they match', () => {
  const schema = {
    properties: {
      dataschema: {
        const: './schemas/event-data.schema.json'
      },
      data: {
        $ref: './schemas/event-data.schema.json'
      }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(true);
});
```

#### Test 1.3: URL-based schema references

```typescript
it('should return valid=true for URL-based schemas when they match', () => {
  const schema = {
    properties: {
      dataschema: {
        const: 'https://example.com/schemas/data.schema.json'
      },
      data: {
        $ref: 'https://example.com/schemas/data.schema.json'
      }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(true);
});
```

### Test Suite 2: Invalid Schemas (Should Fail)

#### Test 2.1: Mismatched values

```typescript
it('should return valid=false when dataschema const does not match data $ref', () => {
  const schema = {
    properties: {
      dataschema: {
        const: '../data/schema-a.yaml'
      },
      data: {
        $ref: '../data/schema-b.yaml'
      }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(false);
  expect(result.errorMessage).toContain('mismatch');
  expect(result.dataschemaValue).toBe('../data/schema-a.yaml');
  expect(result.dataRefValue).toBe('../data/schema-b.yaml');
});
```

#### Test 2.2: Case sensitivity

```typescript
it('should detect case differences as mismatches', () => {
  const schema = {
    properties: {
      dataschema: {
        const: '../data/Schema.yaml'
      },
      data: {
        $ref: '../data/schema.yaml'
      }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(false);
  expect(result.errorMessage).toBeDefined();
});
```

#### Test 2.3: Whitespace differences

```typescript
it('should detect whitespace differences as mismatches', () => {
  const schema = {
    properties: {
      dataschema: {
        const: '../data/schema.yaml '
      },
      data: {
        $ref: '../data/schema.yaml'
      }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(false);
});
```

### Test Suite 3: Schemas Without Pattern (Should Skip)

#### Test 3.1: Missing dataschema property

```typescript
it('should return valid=true (skip) when dataschema property is missing', () => {
  const schema = {
    properties: {
      data: {
        $ref: '../data/schema.yaml'
      }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(true);
  expect(result.errorMessage).toBeUndefined();
});
```

#### Test 3.2: Missing data property

```typescript
it('should return valid=true (skip) when data property is missing', () => {
  const schema = {
    properties: {
      dataschema: {
        const: '../data/schema.yaml'
      }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(true);
});
```

#### Test 3.3: Missing both properties

```typescript
it('should return valid=true (skip) when both properties are missing', () => {
  const schema = {
    properties: {
      type: { const: 'example.event' }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(true);
});
```

#### Test 3.4: Empty schema

```typescript
it('should return valid=true (skip) for empty schema object', () => {
  const schema = {};

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(true);
});
```

### Test Suite 4: Edge Cases

#### Test 4.1: Null dataschema const

```typescript
it('should handle null dataschema const value', () => {
  const schema = {
    properties: {
      dataschema: {
        const: null
      },
      data: {
        $ref: '../data/schema.yaml'
      }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(false);
  expect(result.errorMessage).toContain('null');
});
```

#### Test 4.2: Null data $ref

```typescript
it('should handle null data $ref value', () => {
  const schema = {
    properties: {
      dataschema: {
        const: '../data/schema.yaml'
      },
      data: {
        $ref: null
      }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(false);
});
```

#### Test 4.3: Undefined values

```typescript
it('should handle undefined const value', () => {
  const schema = {
    properties: {
      dataschema: {
        type: 'string'
        // no const property
      },
      data: {
        $ref: '../data/schema.yaml'
      }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(true); // Skip when const is not present
});
```

#### Test 4.4: Non-string values

```typescript
it('should handle non-string const value', () => {
  const schema = {
    properties: {
      dataschema: {
        const: 123
      },
      data: {
        $ref: '../data/schema.yaml'
      }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(false);
  expect(result.errorMessage).toContain('string');
});
```

#### Test 4.5: Empty string values

```typescript
it('should handle empty string values', () => {
  const schema = {
    properties: {
      dataschema: {
        const: ''
      },
      data: {
        $ref: ''
      }
    }
  };

  const result = validateDataschemaConsistency(schema);

  expect(result.valid).toBe(true); // Empty strings match
});
```

### Test Suite 5: Nested Properties

#### Test 5.1: Deep nested schema structure

```typescript
it('should find properties in deeply nested structures', () => {
  const schema = {
    allOf: [
      { $ref: 'base.yaml' }
    ],
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

  expect(result.valid).toBe(true);
});
```

## Integration Tests for Batch Validation Script

### Test File Location

`src/cloudevents/tools/validator/__tests__/validate-dataschema-consistency-script.test.ts`

### Skeleton Script File

**validate-dataschema-consistency.ts**:

```typescript
#!/usr/bin/env tsx

export async function main(args: string[]): Promise<number> {
  throw new Error('Not implemented');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).then(exitCode => {
    process.exit(exitCode);
  });
}
```

### Integration Test Suite

#### Test 6.1: Validate directory with all valid schemas

```typescript
describe('validate-dataschema-consistency script', () => {
  it('should exit with code 0 when all schemas are valid', async () => {
    // Setup test directory with valid schemas
    const testDir = await createTestDirectory([
      {
        name: 'event1.schema.yaml',
        content: validSchemaContent
      },
      {
        name: 'event2.schema.yaml',
        content: validSchemaContent
      }
    ]);

    const exitCode = await main([testDir]);

    expect(exitCode).toBe(0);
  });
});
```

#### Test 6.2: Validate directory with invalid schema

```typescript
it('should exit with non-zero code when any schema is invalid', async () => {
  const testDir = await createTestDirectory([
    {
      name: 'valid.schema.yaml',
      content: validSchemaContent
    },
    {
      name: 'invalid.schema.yaml',
      content: invalidSchemaContent
    }
  ]);

  const exitCode = await main([testDir]);

  expect(exitCode).not.toBe(0);
});
```

#### Test 6.3: Report all failures

```typescript
it('should report all validation failures', async () => {
  const consoleSpy = jest.spyOn(console, 'error');

  const testDir = await createTestDirectory([
    { name: 'invalid1.schema.yaml', content: invalidContent1 },
    { name: 'invalid2.schema.yaml', content: invalidContent2 }
  ]);

  await main([testDir]);

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('invalid1.schema.yaml')
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('invalid2.schema.yaml')
  );
});
```

#### Test 6.4: Recursive directory scanning

```typescript
it('should recursively scan subdirectories', async () => {
  const testDir = await createTestDirectory([
    { name: 'events/event1.schema.yaml', content: validSchemaContent },
    { name: 'events/sub/event2.schema.yaml', content: validSchemaContent }
  ]);

  const exitCode = await main([testDir]);

  expect(exitCode).toBe(0);
});
```

## Real-World Validation Tests

### Test File Location

`src/cloudevents/tools/validator/__tests__/validate-actual-schemas.test.ts`

### Test Suite 7: Validate Actual Project Schemas

#### Test 7.1: All existing event schemas pass validation

```typescript
describe('validate actual project schemas', () => {
  it('should validate all schemas in digital-letters domain pass', async () => {
    const schemaDir = path.join(__dirname, '../../../../domains/digital-letters/2025-10-draft/events');
    const schemaFiles = findAllSchemaFiles(schemaDir);

    const results = schemaFiles.map(file => {
      const schema = loadSchemaFile(file);
      return {
        file,
        result: validateDataschemaConsistency(schema)
      };
    });

    const failures = results.filter(r => !r.result.valid);

    expect(failures).toHaveLength(0);
  });
});
```

## Test Execution Plan

### Phase 1: Setup (RED)

1. Create skeleton implementation files with stub functions
2. Create all test files with complete test cases
3. Run tests - **ALL MUST FAIL** with "Not implemented" errors
4. Verify test infrastructure is working correctly

### Phase 2: Implementation (GREEN)

1. Implement `validateDataschemaConsistency` function
2. Run tests iteratively, implementing just enough to pass each test
3. Implement batch validation script
4. All tests should pass

### Phase 3: Refactor

1. Improve code quality while keeping tests green
2. Add JSDoc comments
3. Optimize performance if needed
4. Ensure consistent error messages

## Success Criteria

- [ ] All skeleton files created
- [ ] All test files created and executable
- [ ] Initial test run shows all tests failing with "Not implemented"
- [ ] Test coverage setup is working
- [ ] Tests cover all requirements from 001-03
- [ ] After implementation, all tests pass
- [ ] Code coverage is 100% for new functions
- [ ] No false positives in actual schema validation

## Test Commands

```bash
# Run unit tests
cd src/cloudevents
npm run test -- validate-dataschema-consistency.test.ts

# Run all related tests
npm run test -- --testPathPattern=dataschema-consistency

# Run with coverage
npm run test:coverage -- validate-dataschema-consistency.test.ts
```
