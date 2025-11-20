import { defaultConfigReader } from 'utils';

export type Config = {
  environment: string;
};

export function loadConfig(overrides: Partial<Config> = {}): Config {
  return {
    environment:
      overrides.environment || defaultConfigReader.getValue('ENVIRONMENT'),
  };
}
