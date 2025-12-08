import { logger, parameterStore } from 'utils';
import { loadConfig } from 'config';
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

  const getAccessToken = async () => {
    const parameter = await parameterStore.getParameter(
      config.accessTokenSsmPath,
    );
    if (!parameter?.Value) {
      throw new Error(
        `Access token parameter "${config.accessTokenSsmPath}" not found in SSM`,
      );
    }

    try {
      const parsed = JSON.parse(parameter.Value);
      return parsed.access_token;
    } catch (error) {
      logger.error('Failed to parse access token from SSM', {
        error,
        value: parameter.Value,
      });
      throw new Error('Invalid access token format in SSM parameter');
    }
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
