import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { Logger } from 'utils';

export interface PdmResource {
  resourceType: string;
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
  };
  status: string;
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
            text: code,
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

// Minimal base64-encoded PDF (valid PDF structure)
const DUMMY_PDF_BASE64 =
  'JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDIgMCBSCi9SZXNvdXJjZXMgPDwvUHJvY1NldCBbL1BERiAvVGV4dF0KL0ZvbnQgPDwvRjEgNCAwIFI+Pgo+Pgo+PgplbmRvYmoKNCAwIG9iago8PC9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKMiAwIG9iago8PC9MZW5ndGggNDQ+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKER1bW15IFBERikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoxIDAgb2JqCjw8L1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjUgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZwovUGFnZXMgMSAwIFIKPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDI1MiAwMDAwMCBuIAowMDAwMDAwMTU3IDAwMDAwIG4gCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDEyNCAwMDAwMCBuIAowMDAwMDAwMzAxIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA2Ci9Sb290IDUgMCBSCj4+CnN0YXJ0eHJlZgozNTAKJSVFT0Y=';

const generateMockResource = (
  id: string,
  includeData: boolean,
): PdmResource => {
  const attachment: any = {
    contentType: 'application/pdf',
    title: 'Dummy PDF',
  };

  if (includeData) {
    attachment.data = DUMMY_PDF_BASE64;
  }

  return {
    resourceType: 'DocumentReference',
    id,
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
    },
    status: 'current',
    author: [
      {
        identifier: {
          system: 'https://fhir.nhs.uk/Id/ods-organization-code',
          value: 'Y05868',
        },
      },
    ],
    subject: {
      identifier: {
        system: 'https://fhir.nhs.uk/Id/nhs-number',
        value: '9912003071',
      },
    },
    content: [
      {
        attachment,
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

    const xRequestId =
      event.headers['X-Request-ID'] ||
      event.headers['x-request-id'] ||
      event.headers['X-REQUEST-ID'];

    if (!xRequestId) {
      logger.warn('Missing X-Request-ID header', { requestId });
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/fhir+json',
        },
        body: JSON.stringify({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'error',
              code: 'required',
              details: {
                text: 'Missing X-Request-ID header',
              },
            },
          ],
        }),
      };
    }

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

    const includeData = resourceId !== 'unavailable-response';
    const resource = generateMockResource(resourceId, includeData);
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

    const xRequestId =
      event.headers['X-Request-ID'] ||
      event.headers['x-request-id'] ||
      event.headers['X-REQUEST-ID'];

    if (!xRequestId) {
      logger.warn('Missing X-Request-ID header', { requestId });
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/fhir+json',
        },
        body: JSON.stringify({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'error',
              code: 'required',
              details: {
                text: 'Missing X-Request-ID header',
              },
            },
          ],
        }),
      };
    }

    const resourceId = xRequestId;

    logger.info('Creating resource', {
      resourceId,
      requestId,
    });

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
      logger.debug('Returning empty success response for create', {
        resourceId,
      });
      return createEmptySuccessResponse();
    }

    const resource = generateMockResource(resourceId, false);
    logger.info('Created mock resource', { resourceId, requestId });
    return createResourceResponse(resource, 201);
  };
};
