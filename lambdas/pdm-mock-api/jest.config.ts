import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  roots: ['<rootDir>/src'],

  testMatch: ['**/__tests__/**/*.test.ts'],

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  moduleNameMapper: {
    '^utils$': '<rootDir>/../../utils/utils',
    '^handlers$': '<rootDir>/src/handlers',
    '^container$': '<rootDir>/src/container',
    '^config$': '<rootDir>/src/config',
    '^authenticator$': '<rootDir>/src/authenticator',
  },
};

export default config;
