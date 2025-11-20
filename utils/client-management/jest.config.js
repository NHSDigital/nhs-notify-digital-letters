const { getConfig } = require('@comms/config-jest/jest.config');
const { name: componentName } = require('./package.json');

const config = getConfig({ packageRoot: '.', componentName });

module.exports = {
  ...config,
  coveragePathIgnorePatterns: [
    ...config.coveragePathIgnorePatterns,
    'entrypoint/cli/',
    'index.ts',
  ],
  transform: { '\\.tsx?$': 'ts-jest' },
};
