import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'failure-codes.ts',
    '!dist/**',
    '!node_modules/**',
    '!generate-csv.ts',
  ],
  coverageDirectory: './.reports/unit/coverage',
  coverageProvider: 'babel',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  testMatch: ['**/*.test.ts'],
};

export default config;
