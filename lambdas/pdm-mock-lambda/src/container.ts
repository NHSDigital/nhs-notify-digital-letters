import { logger } from 'utils';
import { createAuthenticator } from 'authenticator';
import {
  createCreateResourceHandler,
  createGetResourceHandler,
} from 'handlers';

export interface Container {
  authenticator: ReturnType<typeof createAuthenticator>;
  getResourceHandler: ReturnType<typeof createGetResourceHandler>;
  createResourceHandler: ReturnType<typeof createCreateResourceHandler>;
  logger: typeof logger;
}

export const createContainer = (): Container => {
  const authenticator = createAuthenticator(logger);

  const getResourceHandler = createGetResourceHandler(logger);
  const createResourceHandler = createCreateResourceHandler(logger);

  return {
    authenticator,
    getResourceHandler,
    createResourceHandler,
    logger,
  };
};
