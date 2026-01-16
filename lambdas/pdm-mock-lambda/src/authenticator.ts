import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { Logger } from 'utils';

export type AuthResult =
  | { isValid: true }
  | { isValid: false; error: APIGatewayProxyResult };

export const createAuthenticator = (logger: Logger) => {
  return async (
    event: Pick<APIGatewayProxyEvent, 'headers'>,
  ): Promise<AuthResult> => {
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

    const [tokenType] = authHeader.split(' ');

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

    logger.debug('Authentication successful');
    return { isValid: true };
  };
};
