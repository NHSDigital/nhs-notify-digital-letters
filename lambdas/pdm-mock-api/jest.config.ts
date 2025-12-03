import { baseJestConfig } from '../../jest.config.base';

const config = baseJestConfig;

config.coveragePathIgnorePatterns = ['/__tests__/'];

config.coverageThreshold = {
  global: {
    branches: 100,
    functions: 100,
    lines: 90,
    statements: -10,
  },
};

config.moduleNameMapper = {
  '^utils$': '<rootDir>/../../utils/utils',
  '^handlers$': '<rootDir>/src/handlers',
  '^container$': '<rootDir>/src/container',
  '^config$': '<rootDir>/src/config',
  '^authenticator$': '<rootDir>/src/authenticator',
};

export default config;
