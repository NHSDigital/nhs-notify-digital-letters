import { IParameterStore } from 'util-aws';
import { createApp } from './app';
import { loadConfig, type Config } from './config/config';
import { createDomain } from './domain';
import { createInfra } from './infra';

type Dependencies = {
  parameterStore: IParameterStore;
  configOverrides?: Partial<Config>;
};

export function createClientManager({
  parameterStore,
  configOverrides,
}: Dependencies) {
  const config = loadConfig(configOverrides);
  const domain = createDomain();
  const infra = createInfra({ config, domain, parameterStore });

  return createApp({ domain, infra });
}
