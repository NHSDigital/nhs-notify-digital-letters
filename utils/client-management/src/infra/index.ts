import { IParameterStore } from 'utils';
import { ClientRepository } from './client-repository';
import type { IClientRepository } from './interfaces';
import type { Config } from '../config/config';

export type Dependencies = {
  config: Config;
  parameterStore: IParameterStore;
};

export type Infrastructure = {
  clientRepository: IClientRepository;
};

export function createInfra({
  config,
  parameterStore,
}: Dependencies): Infrastructure {
  const clientRepository = new ClientRepository({ config, parameterStore });

  return {
    clientRepository
  };
}
