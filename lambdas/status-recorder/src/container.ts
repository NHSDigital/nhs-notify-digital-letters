import { HandlerDependencies } from 'apis/firehose-handler';
import { logger } from 'utils';

export const createContainer = (): HandlerDependencies => {
  return { logger };
};

export default createContainer;
