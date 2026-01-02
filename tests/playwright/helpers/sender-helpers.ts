import { ENV } from 'constants/backend-constants';
import { SenderManagement } from 'sender-management';
import { ParameterStoreCache } from 'utils';

const parameterStore = new ParameterStoreCache();

const senderRepository = SenderManagement({
  configOverrides: { environment: ENV },
  parameterStore,
});

export default senderRepository;
