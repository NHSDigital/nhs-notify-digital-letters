import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'failure-codes.ts',
    'generate-csv.ts',
    '!dist/**',
    '!node_modules/**',
  ],
  coverageDirectory: './.reports/unit/coverage',
  coverageProvider: 'babel',
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  testMatch: ['**/*.test.ts'],
};

export default config;
