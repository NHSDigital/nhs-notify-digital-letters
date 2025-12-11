import { IParameterStore, logger } from 'utils';
import { createApp } from './app';
import { type Config, loadConfig } from './config/config';
import { createDomain } from './domain';
import { createInfra } from './infra';

type Dependencies = {
  parameterStore: IParameterStore;
  configOverrides?: Partial<Config>;
};

export function createSenderManager({
  configOverrides,
  parameterStore,
}: Dependencies) {
  const config = loadConfig(configOverrides);
  const domain = createDomain();
  const infra = createInfra({ config, parameterStore, logger });

  return createApp({ domain, infra });
}
