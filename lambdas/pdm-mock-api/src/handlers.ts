import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { Logger } from 'utils';

/**
 * Mock resource data structure for PDM resources
 */
export interface PdmResource {
  resourceType: string;
  id: string;
  status: string;
  created: string;
  [key: string]: unknown;
}

const ERROR_SCENARIOS = [
  {
    id: 'error-400-invalid',
    statusCode: 400,
    code: 'INVALID_VALUE',
    message: 'Invalid resource value',
  },
  {
    id: 'error-401-unauthorized',
    statusCode: 401,
    code: 'UNAUTHORISED',
    message: 'Unauthorized access',
  },
  {
    id: 'error-403-forbidden',
    statusCode: 403,
    code: 'FORBIDDEN',
    message: 'Access forbidden',
  },
  {
    id: 'error-404-notfound',
    statusCode: 404,
    code: 'RESOURCE_NOT_FOUND',
    message: 'Resource not found',
  },
  {
    id: 'error-409-conflict',
    statusCode: 409,
    code: 'CONFLICT',
    message: 'Resource already exists',
  },
  {
    id: 'error-422-unprocessable',
    statusCode: 422,
    code: 'UNPROCESSABLE',
    message: 'Unprocessable entity',
  },
  {
    id: 'error-429-ratelimit',
    statusCode: 429,
    code: 'TOO_MANY_REQUESTS',
    message: 'Rate limit exceeded',
  },
  {
    id: 'error-500-internal',
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  },
  {
    id: 'error-502-badgateway',
    statusCode: 502,
    code: 'BAD_GATEWAY',
    message: 'Bad gateway',
  },
  {
    id: 'error-503-unavailable',
    statusCode: 503,
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
  },
  {
    id: 'error-504-timeout',
    statusCode: 504,
    code: 'GATEWAY_TIMEOUT',
    message: 'Gateway timeout',
  },
];

const createErrorResponse = (
  statusCode: number,
  code: string,
  message: string,
  logger: Logger,
): APIGatewayProxyResult => {
  logger.error('Returning error response', { statusCode, code, message });

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/fhir+json',
    },
    body: JSON.stringify({
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity: 'error',
          code: 'unknown',
          details: {
            coding: [{ code }],
          },
          diagnostics: message,
        },
      ],
    }),
  };
};

const createResourceResponse = (
  resource: PdmResource,
  statusCode = 200,
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/fhir+json',
    },
    body: JSON.stringify(resource),
  };
};

const createEmptySuccessResponse = (): APIGatewayProxyResult => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/fhir+json',
    },
    body: JSON.stringify({}),
  };
};

const generateMockResource = (id: string): PdmResource => {
  return {
    resourceType: 'CommunicationRequest',
    id,
    status: 'active',
    created: new Date().toISOString(),
    subject: {
      reference: `Patient/${id}`,
    },
    payload: [
      {
        contentString: 'Mock PDM resource content',
      },
    ],
  };
};

export const createGetResourceHandler = (logger: Logger) => {
  return async (
    event: APIGatewayProxyEvent,
  ): Promise<APIGatewayProxyResult> => {
    const resourceId = event.pathParameters?.id;
    const { requestId } = event.requestContext;

    logger.info('GET resource request received', { resourceId, requestId });

    if (!resourceId) {
      return createErrorResponse(
        400,
        'INVALID_REQUEST',
        'Resource ID is required',
        logger,
      );
    }

    const errorScenario = ERROR_SCENARIOS.find((s) => s.id === resourceId);
    if (errorScenario) {
      logger.debug('Triggering error scenario', {
        resourceId,
        scenario: errorScenario,
      });
      return createErrorResponse(
        errorScenario.statusCode,
        errorScenario.code,
        errorScenario.message,
        logger,
      );
    }

    if (resourceId === 'empty-response') {
      logger.debug('Returning empty success response', { resourceId });
      return createEmptySuccessResponse();
    }

    const resource = generateMockResource(resourceId);
    logger.info('Returning mock resource', { resourceId, requestId });
    return createResourceResponse(resource);
  };
};

export const createCreateResourceHandler = (logger: Logger) => {
  return async (
    event: APIGatewayProxyEvent,
  ): Promise<APIGatewayProxyResult> => {
    const { requestId } = event.requestContext;

    logger.info('POST create resource request received', { requestId });

    let requestBody: any;
    try {
      requestBody = event.body ? JSON.parse(event.body) : {};
    } catch (error) {
      logger.warn('Failed to parse request body', { error, body: event.body });
      return createErrorResponse(
        400,
        'INVALID_REQUEST',
        'Invalid JSON in request body',
        logger,
      );
    }

    const resourceId = requestBody.id || `generated-${Date.now()}`;

    if (requestBody.triggerError) {
      const errorScenario = ERROR_SCENARIOS.find(
        (s) => s.id === requestBody.triggerError,
      );
      if (errorScenario) {
        logger.debug('Triggering error scenario from request body', {
          resourceId,
          scenario: errorScenario,
        });
        return createErrorResponse(
          errorScenario.statusCode,
          errorScenario.code,
          errorScenario.message,
          logger,
        );
      }
    }

    if (requestBody.emptyResponse) {
      logger.debug('Returning empty success response for create', {
        resourceId,
      });
      return createEmptySuccessResponse();
    }

    const resource = generateMockResource(resourceId);
    logger.info('Created mock resource', { resourceId, requestId });
    return createResourceResponse(resource, 201);
  };
};
