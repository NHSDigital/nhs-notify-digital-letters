import { baseJestConfig } from '../../jest.config.base';

const config = {
  ...baseJestConfig,
  coveragePathIgnorePatterns: [
    ...(baseJestConfig.coveragePathIgnorePatterns ?? []),
    'src/merge-allof-cli.ts',
  ],
};

export default config;
