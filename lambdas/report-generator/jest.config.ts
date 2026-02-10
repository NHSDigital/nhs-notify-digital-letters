import { baseJestConfig } from '../../jest.config.base';

const config = {
    ...baseJestConfig,
    coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  }
};

export default config;
