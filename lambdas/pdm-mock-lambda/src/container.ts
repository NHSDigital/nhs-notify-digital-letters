import { logger } from 'utils';
import {
  createCreateResourceHandler,
  createGetResourceHandler,
} from 'handlers';

export interface Container {
  getResourceHandler: ReturnType<typeof createGetResourceHandler>;
  createResourceHandler: ReturnType<typeof createCreateResourceHandler>;
  logger: typeof logger;
}

export const createContainer = (): Container => {
  const getResourceHandler = createGetResourceHandler(logger);
  const createResourceHandler = createCreateResourceHandler(logger);

  return {
    getResourceHandler,
    createResourceHandler,
    logger,
  };
};
