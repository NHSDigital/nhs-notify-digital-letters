import { ENV } from 'constants/backend-constants';
import { SenderRepository } from 'sender-management/src/infra/sender-repository';
import { ParameterStoreCache, logger } from 'utils';

const parameterStore = new ParameterStoreCache();

const senderRepository = new SenderRepository({
  config: { environment: ENV },
  logger,
  parameterStore,
});

export default senderRepository;
