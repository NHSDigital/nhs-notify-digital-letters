import { baseJestConfig } from '../../jest.config.base';

const config = {
  ...baseJestConfig,
  coveragePathIgnorePatterns: [
    ...(baseJestConfig.coveragePathIgnorePatterns ?? []),
    'src/generate-types-cli.ts',
    'src/generate-validators-cli.ts',
  ],
};

export default config;
