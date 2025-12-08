import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { Logger } from 'utils';

export interface AuthConfig {
  mockAccessToken: string;
  useNonMockToken: boolean;
  getAccessToken: () => Promise<string>;
}

export const createAuthenticator = (authConfig: AuthConfig, logger: Logger) => {
  return async (
    event: Pick<APIGatewayProxyEvent, 'headers'>,
  ): Promise<{ isValid: boolean; error?: APIGatewayProxyResult }> => {
    const authHeader =
      event.headers?.Authorization || event.headers?.authorization;

    if (!authHeader) {
      logger.warn('Missing Authorization header');
      return {
        isValid: false,
        error: {
          statusCode: 401,
          body: JSON.stringify({
            resourceType: 'OperationOutcome',
            issue: [
              {
                severity: 'error',
                code: 'forbidden',
                details: {
                  coding: [{ code: 'ACCESS_DENIED' }],
                },
                diagnostics: 'Missing Authentication Token',
              },
            ],
          }),
        },
      };
    }

    const [tokenType, token] = authHeader.split(' ');

    if (tokenType !== 'Bearer') {
      logger.warn(tokenType, 'Invalid token type');
      return {
        isValid: false,
        error: {
          statusCode: 401,
          body: JSON.stringify({
            resourceType: 'OperationOutcome',
            issue: [
              {
                severity: 'error',
                code: 'forbidden',
                details: {
                  coding: [{ code: 'ACCESS_DENIED' }],
                },
                diagnostics: 'Invalid Access Token',
              },
            ],
          }),
        },
      };
    }

    const validToken = authConfig.useNonMockToken
      ? await authConfig.getAccessToken()
      : authConfig.mockAccessToken;

    // eslint-disable-next-line security/detect-possible-timing-attacks
    if (token !== validToken) {
      logger.warn('Token validation failed');
      return {
        isValid: false,
        error: {
          statusCode: 401,
          body: JSON.stringify({
            resourceType: 'OperationOutcome',
            issue: [
              {
                severity: 'error',
                code: 'forbidden',
                details: {
                  coding: [{ code: 'ACCESS_DENIED' }],
                },
                diagnostics: 'Invalid Access Token',
              },
            ],
          }),
        },
      };
    }

    logger.debug('Authentication successful');
    return { isValid: true };
  };
};
