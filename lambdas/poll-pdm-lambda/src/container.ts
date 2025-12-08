import { logger } from 'utils';
import { HandlerDependencies } from 'apis/sqs-handler';

export const createContainer = (): HandlerDependencies => {
  return { logger };
};

export default createContainer;
