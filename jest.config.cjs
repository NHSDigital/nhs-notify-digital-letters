/**
 * Root Jest config — runs all TypeScript/JavaScript workspace test suites in
 * parallel via Jest's native `projects` support.
 *
 * Written as CJS (.cjs) so Jest can load it without needing a root tsconfig.json.
 * The base config is inlined from jest.config.base.ts to keep this file
 * self-contained and avoid any TypeScript compilation at load time, which would
 * require a root tsconfig.json and risk interfering with workspace ts-jest runs.
 *
 * When jest.config.base.ts changes, this file must be kept in sync manually.
 *
 * Each project's rootDir is set to its workspace directory so that relative
 * paths (coverageDirectory, HTML reporter outputPath, etc.) resolve relative
 * to the workspace, not the repo root.
 *
 * Note: src/cloudevents has a hand-rolled jest.config.cjs; it is included via
 * its directory path so Jest discovers that file directly.
 *
 * Note: src/digital-letters-events and tests/playwright have no Jest tests
 * and are intentionally excluded.
 */

const base = {
  preset: 'ts-jest',
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],
  coverageDirectory: './.reports/unit/coverage',
  coverageProvider: 'babel',
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: -10 },
  },
  coveragePathIgnorePatterns: ['/__tests__/'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testPathIgnorePatterns: ['.build'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Test Report',
        outputPath: './.reports/unit/test-report.html',
        includeFailureMsg: true,
      },
    ],
  ],
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', 'src'],
};

// Workspaces that use the base config with no overrides
const standardWorkspaces = [
  'lambdas/file-scanner-lambda',
  'lambdas/key-generation',
  'lambdas/refresh-apim-access-token',
  'lambdas/pdm-mock-lambda',
  'lambdas/pdm-poll-lambda',
  'lambdas/ttl-create-lambda',
  'lambdas/ttl-handle-expiry-lambda',
  'lambdas/ttl-poll-lambda',
  'lambdas/pdm-uploader-lambda',
  'lambdas/print-sender-lambda',
  'lambdas/print-analyser',
  'lambdas/report-scheduler',
  'lambdas/report-event-transformer',
  'lambdas/move-scanned-files-lambda',
  'lambdas/report-generator',
  'utils/sender-management',
];

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // Standard workspaces — no overrides
    ...standardWorkspaces.map((ws) => ({
      ...base,
      rootDir: `<rootDir>/${ws}`,
      displayName: ws,
    })),

    // utils/utils — relaxed coverage thresholds + exclude index.ts
    {
      ...base,
      rootDir: '<rootDir>/utils/utils',
      displayName: 'utils/utils',
      coverageThreshold: {
        global: { branches: 85, functions: 85, lines: 85, statements: -10 },
      },
      coveragePathIgnorePatterns: [...base.coveragePathIgnorePatterns, 'index.ts'],
    },

    // lambdas/core-notifier-lambda — moduleNameMapper unifies `crypto` and
    // `node:crypto` in Jest's registry so that jest.mock('node:crypto') in the
    // test files also intercepts the bare require('crypto') call made by
    // node-jose at module-load time, preventing an undefined helpers.nodeCrypto
    // crash in ecdsa.js.
    {
      ...base,
      rootDir: '<rootDir>/lambdas/core-notifier-lambda',
      displayName: 'lambdas/core-notifier-lambda',
    },

    // lambdas/print-status-handler — @nhsdigital/nhs-notify-event-schemas-supplier-api
    // ships ESM source; it must be transformed by ts-jest rather than skipped.
    {
      ...base,
      rootDir: '<rootDir>/lambdas/print-status-handler',
      displayName: 'lambdas/print-status-handler',
      transformIgnorePatterns: [
        'node_modules/(?!@nhsdigital/nhs-notify-event-schemas-supplier-api)',
      ],
    },

    // src/python-schema-generator — excludes merge-allof CLI entry point
    {
      ...base,
      rootDir: '<rootDir>/src/python-schema-generator',
      displayName: 'src/python-schema-generator',
      coveragePathIgnorePatterns: [
        ...base.coveragePathIgnorePatterns,
        'src/merge-allof-cli.ts',
      ],
    },

    // src/typescript-schema-generator — excludes CLI entry points.
    // Requires --experimental-vm-modules (set via NODE_OPTIONS in the
    // test:unit:parallel script) because json-schema-to-typescript uses a
    // dynamic import() of prettier at runtime, which Node.js rejects inside a
    // Jest VM context without the flag.
    {
      ...base,
      rootDir: '<rootDir>/src/typescript-schema-generator',
      displayName: 'src/typescript-schema-generator',
      coveragePathIgnorePatterns: [
        ...base.coveragePathIgnorePatterns,
        'src/generate-types-cli.ts',
        'src/generate-validators-cli.ts',
      ],
    },

    // src/cloudevents — uses its own jest.config.cjs (hand-rolled ts-jest options)
    '<rootDir>/src/cloudevents',
  ],
};
