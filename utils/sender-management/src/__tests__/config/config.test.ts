import { Config, loadConfig } from 'config/config';

jest.mock('utils', () => ({
  defaultConfigReader: {
    getValue: jest.fn().mockReturnValue('default-unit-test-environment'),
  },
}));

describe('loadConfig', () => {
  it('should load default configuration', () => {
    const config: Partial<Config> = {};
    const loadedConfig = loadConfig(config);
    expect(loadedConfig.environment).toEqual('default-unit-test-environment');
  });

  it('should load overriden configuration', () => {
    const config: Partial<Config> = { environment: 'overrides-unit-test' };
    const loadedConfig = loadConfig(config);
    expect(loadedConfig.environment).toEqual('overrides-unit-test');
  });
});
