/**
 * Unit tests for validateDataschemaConsistency function
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateDataschemaConsistency,
  type DataschemaConsistencyResult
} from '../dataschema-consistency-lib';

describe('validateDataschemaConsistency', () => {
  describe('Valid Schemas (Should Pass)', () => {
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

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

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

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(true);
    });

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

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid Schemas (Should Fail)', () => {
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

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('mismatch');
      expect(result.dataschemaValue).toBe('../data/schema-a.yaml');
      expect(result.dataRefValue).toBe('../data/schema-b.yaml');
    });

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

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

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

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(false);
    });
  });

  describe('Schemas Without Pattern (Should Skip)', () => {
    it('should return valid=true (skip) when dataschema property is missing', () => {
      const schema = {
        properties: {
          data: {
            $ref: '../data/schema.yaml'
          }
        }
      };

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should return valid=true (skip) when data property is missing', () => {
      const schema = {
        properties: {
          dataschema: {
            const: '../data/schema.yaml'
          }
        }
      };

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(true);
    });

    it('should return valid=true (skip) when both properties are missing', () => {
      const schema = {
        properties: {
          type: { const: 'example.event' }
        }
      };

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(true);
    });

    it('should return valid=true (skip) for empty schema object', () => {
      const schema = {};

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
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

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('null');
    });

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

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(false);
    });

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

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(true); // Skip when const is not present
    });

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

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('string');
    });

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

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(true); // Empty strings match
    });
  });

  describe('Nested Properties', () => {
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

      const result: DataschemaConsistencyResult = validateDataschemaConsistency(schema);

      expect(result.valid).toBe(true);
    });
  });
});
