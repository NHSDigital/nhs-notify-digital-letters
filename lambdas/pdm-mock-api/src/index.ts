import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from 'aws-lambda';
import { createContainer } from 'container';

const container = createContainer();

export const handler: Handler<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { authenticator, createResourceHandler, getResourceHandler, logger } =
    container;

  try {
    const { requestId } = event.requestContext;
    const { httpMethod } = event;
    const { path } = event;

    logger.info('PDM mock API request received', {
      requestId,
      httpMethod,
      path,
      hasAuth: !!event.headers?.Authorization,
    });

    const authResult = await authenticator(event);
    if (!authResult.isValid) {
      logger.warn('Authentication failed', { requestId, httpMethod, path });
      return authResult.error!;
    }

    if (httpMethod === 'GET' && path.includes('/resource/')) {
      return await getResourceHandler(event);
    }
    if (httpMethod === 'POST' && path.includes('/resource')) {
      return await createResourceHandler(event);
    }
    logger.warn('Unsupported endpoint', { httpMethod, path });
    return {
      statusCode: 404,
      body: JSON.stringify({
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'error',
            code: 'not-found',
            diagnostics: `Endpoint ${httpMethod} ${path} not found`,
          },
        ],
      }),
    };
  } catch (error) {
    logger.error('Unhandled error in PDM mock API', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'error',
            code: 'exception',
            diagnostics: 'Internal server error',
          },
        ],
      }),
    };
  }
};

export default handler;
