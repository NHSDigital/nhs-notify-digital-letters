import { IParameterStore, Logger } from 'utils';
import { SenderRepository } from './sender-repository';
import type { ISenderRepository } from './interfaces';
import type { Config } from '../config/config';

export type Dependencies = {
  config: Config;
  parameterStore: IParameterStore;
  logger: Logger;
};

export type Infrastructure = {
  senderRepository: ISenderRepository;
};

export function createInfra(dependencies: Dependencies): Infrastructure {
  const senderRepository = new SenderRepository(dependencies);

  return {
    senderRepository,
  };
}
