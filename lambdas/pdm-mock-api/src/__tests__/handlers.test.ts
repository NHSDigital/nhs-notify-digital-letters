import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { Logger } from 'utils';
import {
  createCreateResourceHandler,
  createGetResourceHandler,
} from 'handlers';

const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn(),
} as any;

const createMockEvent = (
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent => {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/resource/test-id',
    pathParameters: { id: 'test-id' },
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789',
      apiId: 'api-id',
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      path: '/resource/test-id',
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'resource-id',
      resourcePath: '/resource/{id}',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      } as any,
      authorizer: null,
    } as any,
    resource: '/resource/{id}',
    ...overrides,
  } as APIGatewayProxyEvent;
};

describe('GET Resource Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a mock resource for valid resource ID', async () => {
    const handler = createGetResourceHandler(mockLogger);
    const event = createMockEvent();

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Content-Type']).toBe('application/fhir+json');

    const body = JSON.parse(response.body);
    expect(body.resourceType).toBe('CommunicationRequest');
    expect(body.id).toBe('test-id');
    expect(body.status).toBe('active');
    expect(body.created).toBeDefined();
  });

  it('should return 400 error when resource ID is missing', async () => {
    const handler = createGetResourceHandler(mockLogger);
    const event = createMockEvent({ pathParameters: null });

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.resourceType).toBe('OperationOutcome');
    expect(body.issue[0].details.coding[0].code).toBe('INVALID_REQUEST');
  });

  it('should return empty response for empty-response scenario', async () => {
    const handler = createGetResourceHandler(mockLogger);
    const event = createMockEvent({ pathParameters: { id: 'empty-response' } });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('{}');
  });

  describe('error scenarios', () => {
    const errorCases = [
      {
        id: 'error-400-invalid',
        expectedStatus: 400,
        expectedCode: 'INVALID_VALUE',
      },
      {
        id: 'error-401-unauthorized',
        expectedStatus: 401,
        expectedCode: 'UNAUTHORISED',
      },
      {
        id: 'error-403-forbidden',
        expectedStatus: 403,
        expectedCode: 'FORBIDDEN',
      },
      {
        id: 'error-404-notfound',
        expectedStatus: 404,
        expectedCode: 'RESOURCE_NOT_FOUND',
      },
      {
        id: 'error-429-ratelimit',
        expectedStatus: 429,
        expectedCode: 'TOO_MANY_REQUESTS',
      },
      {
        id: 'error-500-internal',
        expectedStatus: 500,
        expectedCode: 'INTERNAL_ERROR',
      },
      {
        id: 'error-503-unavailable',
        expectedStatus: 503,
        expectedCode: 'SERVICE_UNAVAILABLE',
      },
    ];

    for (const { expectedCode, expectedStatus, id } of errorCases) {
      it(`should return ${expectedStatus} error for ${id}`, async () => {
        const handler = createGetResourceHandler(mockLogger);
        const event = createMockEvent({ pathParameters: { id } });

        const response = await handler(event);

        expect(response.statusCode).toBe(expectedStatus);
        const body = JSON.parse(response.body);
        expect(body.resourceType).toBe('OperationOutcome');
        expect(body.issue[0].details.coding[0].code).toBe(expectedCode);
      });
    }
  });
});

describe('POST Create Resource Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new resource with provided ID', async () => {
    const handler = createCreateResourceHandler(mockLogger);
    const event = createMockEvent({
      httpMethod: 'POST',
      body: JSON.stringify({ id: 'custom-id' }),
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(201);
    expect(response.headers?.['Content-Type']).toBe('application/fhir+json');

    const body = JSON.parse(response.body);
    expect(body.resourceType).toBe('CommunicationRequest');
    expect(body.id).toBe('custom-id');
    expect(body.status).toBe('active');
  });

  it('should create a new resource with generated ID when not provided', async () => {
    const handler = createCreateResourceHandler(mockLogger);
    const event = createMockEvent({
      httpMethod: 'POST',
      body: JSON.stringify({}),
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.body);
    expect(body.id).toMatch(/^generated-\d+$/);
  });

  it('should handle empty body', async () => {
    const handler = createCreateResourceHandler(mockLogger);
    const event = createMockEvent({
      httpMethod: 'POST',
      body: null,
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.id).toMatch(/^generated-\d+$/);
  });

  it('should return 400 error for invalid JSON', async () => {
    const handler = createCreateResourceHandler(mockLogger);
    const event = createMockEvent({
      httpMethod: 'POST',
      body: 'invalid-json{',
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.resourceType).toBe('OperationOutcome');
    expect(body.issue[0].details.coding[0].code).toBe('INVALID_REQUEST');
  });

  it('should return empty response when emptyResponse flag is set', async () => {
    const handler = createCreateResourceHandler(mockLogger);
    const event = createMockEvent({
      httpMethod: 'POST',
      body: JSON.stringify({ emptyResponse: true }),
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('{}');
  });

  it('should trigger error scenarios via triggerError field', async () => {
    const handler = createCreateResourceHandler(mockLogger);
    const event = createMockEvent({
      httpMethod: 'POST',
      body: JSON.stringify({ triggerError: 'error-409-conflict' }),
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.issue[0].details.coding[0].code).toBe('CONFLICT');
  });
});
