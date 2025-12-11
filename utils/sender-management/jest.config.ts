import { baseJestConfig } from '../../jest.config.base';

const config = baseJestConfig;

config.coverageThreshold = {
  global: {
    branches: 84,
    functions: 91,
    lines: 90,
    statements: -10,
  },
};

export default config;
