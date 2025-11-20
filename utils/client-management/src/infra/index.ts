import { IParameterStore } from '@comms/util-aws';
import { ClientRepository } from './client-repository';
import { MetadataRepository } from './metadata-repository';
import type { IClientRepository, IMetadataRepository } from './interfaces';
import type { Config } from '../config/config';
import type { Domain } from '../domain';

export type Dependencies = {
  config: Config;
  domain: Domain;
  parameterStore: IParameterStore;
};

export type Infrastructure = {
  clientRepository: IClientRepository;
  metadataRepository: IMetadataRepository;
};

export function createInfra({
  config,
  domain,
  parameterStore,
}: Dependencies): Infrastructure {
  const clientRepository = new ClientRepository({ config, parameterStore });

  const metadataRepository = new MetadataRepository({
    parameterStore,
    config,
    domain,
  });

  return {
    clientRepository,
    metadataRepository,
  };
}
