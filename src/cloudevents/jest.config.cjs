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
        allowImportingTsExtensions: true,
        module: 'commonjs',
        target: 'ES2020',
        moduleResolution: 'node',
        noEmit: true
      },
      diagnostics: {
        ignoreCodes: [1343]  // Ignore TS1343: import.meta errors
      }
    }]
  },
  collectCoverageFrom: [
    'tools/**/*.{ts,js,cjs}',
    '!tools/**/*.d.ts',
    '!tools/**/__tests__/**',
    '!tools/**/*.test.ts',
    '!tools/**/*.spec.ts',
    '!tools/builder/build-schema.ts',
    '!tools/generator/generate-example.ts',
    '!tools/generator/manual-bundle-schema.ts',
    '!tools/validator/validate.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'cobertura'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^(.*)\\.ts$': '$1',
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './.reports/unit',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: false,
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],
  verbose: true,
  testTimeout: 10000
};
