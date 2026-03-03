import { baseJestConfig } from '../../jest.config.base';

const config = baseJestConfig;

config.coverageThreshold = {
  global: {
    branches: 88,
    functions: 100,
    lines: 97,
    statements: 97,
  },
};

export default config;
