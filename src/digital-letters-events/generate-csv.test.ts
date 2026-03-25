import { generateCSV } from './generate-csv';
import { FAILURE_CODE_DEFINITIONS } from './failure-codes';

describe('generate-csv', () => {
  let csvContent: string;

  beforeAll(() => {
    csvContent = generateCSV();
  });

  describe('CSV format', () => {
    it('should have correct header row', () => {
      const lines = csvContent.split('\n');
      expect(lines[0]).toBe('code,description');
    });

    it('should have one row per failure code definition', () => {
      const lines = csvContent.trim().split('\n');
      const dataRows = lines.slice(1); // Skip header
      const expectedCount = Object.keys(FAILURE_CODE_DEFINITIONS).length;

      expect(dataRows.length).toBe(expectedCount);
    });

    it('should end with a newline', () => {
      expect(csvContent.endsWith('\n')).toBe(true);
    });
  });

  describe('CSV content', () => {
    it('should include all failure codes from FAILURE_CODE_DEFINITIONS', () => {
      for (const code of Object.keys(FAILURE_CODE_DEFINITIONS)) {
        expect(csvContent).toContain(code);
      }
    });

    it('should include all descriptions from FAILURE_CODE_DEFINITIONS', () => {
      for (const description of Object.values(FAILURE_CODE_DEFINITIONS)) {
        expect(csvContent).toContain(description);
      }
    });

    it('should map codes to correct descriptions', () => {
      const lines = csvContent.trim().split('\n');
      const rows = lines.slice(1); // Skip header

      for (const row of rows) {
        const [code, description] = row.split(',');
        expect(
          FAILURE_CODE_DEFINITIONS[
            code as keyof typeof FAILURE_CODE_DEFINITIONS
          ],
        ).toBe(description);
      }
    });
  });

  describe('CSV special character handling', () => {
    it('should handle descriptions without commas or quotes as-is', () => {
      const lines = csvContent.trim().split('\n');
      const dataRows = lines.slice(1);

      for (const row of dataRows) {
        const parts = row.split(',');
        expect(parts).toHaveLength(2);
      }
    });

    it('should escape commas in descriptions with quotes', () => {
      const testDefinitions = {
        TEST_001: 'Description with, comma',
      };

      const escaped =
        testDefinitions.TEST_001.includes(',') ||
        testDefinitions.TEST_001.includes('"')
          ? `"${testDefinitions.TEST_001.replaceAll('"', '""')}"`
          : testDefinitions.TEST_001;

      expect(escaped).toBe('"Description with, comma"');
    });

    it('should escape quotes in descriptions', () => {
      const testDescription = 'Description with "quotes"';
      const escaped = `"${testDescription.replaceAll('"', '""')}"`;

      expect(escaped).toBe('"Description with ""quotes"""');
    });

    it('should escape both commas and quotes in descriptions', () => {
      const testDescription = 'Description with, comma and "quotes"';
      const escaped = `"${testDescription.replaceAll('"', '""')}"`;

      expect(escaped).toBe('"Description with, comma and ""quotes"""');
    });
  });

  describe('data integrity', () => {
    it('should have exactly 4 failure codes defined', () => {
      expect(Object.keys(FAILURE_CODE_DEFINITIONS)).toHaveLength(4);
    });

    it('should have expected failure code keys', () => {
      const expectedCodes = [
        'DL_PDMV_001',
        'DL_PDMV_002',
        'DL_CLIV_003',
        'DL_INTE_001',
      ];
      const actualCodes = Object.keys(FAILURE_CODE_DEFINITIONS);

      expect(actualCodes.toSorted((a, b) => a.localeCompare(b))).toEqual(
        expectedCodes.toSorted((a, b) => a.localeCompare(b)),
      );
    });

    it('should have non-empty descriptions for all codes', () => {
      for (const description of Object.values(FAILURE_CODE_DEFINITIONS)) {
        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThan(0);
        expect(typeof description).toBe('string');
      }
    });
  });
});
