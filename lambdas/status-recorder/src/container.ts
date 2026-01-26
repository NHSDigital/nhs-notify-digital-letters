import { HandlerDependencies } from 'apis/sqs-handler';
import { loadConfig } from 'infra/config';
import { logger } from 'utils';

export const createContainer = (): HandlerDependencies => {
  const { athenaArn } = loadConfig();

  return { athenaArn, logger };
};

export default createContainer;
