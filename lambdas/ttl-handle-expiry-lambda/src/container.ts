import { logger } from 'utils';
import { CreateHandlerDependencies } from 'apis/dynamodb-stream-handler';

export const createContainer = (): CreateHandlerDependencies => {
  return { logger };
};

export default createContainer;
