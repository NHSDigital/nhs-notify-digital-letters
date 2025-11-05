/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'commonjs',
        target: 'ES2020',
        moduleResolution: 'node'
      }
    }]
  },
  collectCoverageFrom: [
    'tools/cache/**/*.ts',
    '!tools/**/*.d.ts',
    '!tools/**/__tests__/**',
    '!tools/**/*.test.ts',
    '!tools/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'cobertura'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/'
  ],
  // Make coverage paths relative to repository root for SonarCloud
  coverageReporters: ['text', ['lcov', { projectRoot: '../..' }], 'html', 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 10000
};
