/**
 * Dataschema Consistency Validation Library
 *
 * Validates that CloudEvents schema dataschema const values match data $ref values
 */

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
 * Validate that dataschema const value matches data $ref value in CloudEvents schemas
 * @param schema - Parsed schema object to validate
 * @returns Validation result with valid flag and details
 */
export function validateDataschemaConsistency(schema: any): DataschemaConsistencyResult {
  // Skip validation if schema is empty or properties are missing
  if (!schema || !schema.properties) {
    return { valid: true };
  }

  const { dataschema, data } = schema.properties;

  // Skip if either property is missing
  if (!dataschema || !data) {
    return { valid: true };
  }

  // Get the const value from dataschema
  const dataschemaConst = dataschema.const;

  // Skip if const is not present (undefined)
  if (dataschemaConst === undefined) {
    return { valid: true };
  }

  // Get the $ref value from data
  const dataRef = data.$ref;

  // Validate that dataschemaConst is a string
  if (typeof dataschemaConst !== 'string') {
    return {
      valid: false,
      dataschemaValue: dataschemaConst,
      dataRefValue: dataRef,
      errorMessage: dataschemaConst === null
        ? 'dataschema const is null'
        : 'dataschema const must be a string'
    };
  }

  // Validate that dataRef is present and is a string
  if (dataRef === null) {
    return {
      valid: false,
      dataschemaValue: dataschemaConst,
      dataRefValue: dataRef,
      errorMessage: 'data $ref is null'
    };
  }

  if (typeof dataRef !== 'string') {
    return {
      valid: false,
      dataschemaValue: dataschemaConst,
      dataRefValue: dataRef,
      errorMessage: 'data $ref must be a string'
    };
  }

  // Compare values - must match exactly (case-sensitive, whitespace-sensitive)
  if (dataschemaConst !== dataRef) {
    return {
      valid: false,
      dataschemaValue: dataschemaConst,
      dataRefValue: dataRef,
      errorMessage: 'dataschema const does not match data $ref (mismatch detected)'
    };
  }

  // Values match - validation passed
  return {
    valid: true,
    dataschemaValue: dataschemaConst,
    dataRefValue: dataRef
  };
}
