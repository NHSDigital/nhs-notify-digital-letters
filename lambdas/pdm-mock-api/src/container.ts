import { logger } from 'utils';
import { ParameterStoreService, loadConfig } from 'config';
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
  const config = loadConfig();
  const parameterStore = new ParameterStoreService();

  const getAccessToken = async () => {
    return parameterStore.getParameter(config.accessTokenSsmPath);
  };

  const authenticator = createAuthenticator(
    {
      mockAccessToken: config.mockAccessToken,
      useNonMockToken: config.useNonMockToken,
      getAccessToken,
    },
    logger,
  );

  const getResourceHandler = createGetResourceHandler(logger);
  const createResourceHandler = createCreateResourceHandler(logger);

  return {
    authenticator,
    getResourceHandler,
    createResourceHandler,
    logger,
  };
};
