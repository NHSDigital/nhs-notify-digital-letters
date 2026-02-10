import { baseJestConfig } from '../../jest.config.base';

const config = baseJestConfig;

config.coverageThreshold = {
  global: {
    branches: 84,
    functions: 100,
    lines: 95,
    statements: -10,
  },
};

export default config;
