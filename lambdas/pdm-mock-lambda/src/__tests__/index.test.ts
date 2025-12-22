import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Callback,
  Context,
} from 'aws-lambda';
import { createContainer } from 'container';
import { handler } from '..';

jest.mock('container', () => {
  const mockAuthenticator = jest.fn();
  const mockGetResourceHandler = jest.fn();
  const mockCreateResourceHandler = jest.fn();
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  };

  return {
    createContainer: jest.fn(() => ({
      authenticator: mockAuthenticator,
      getResourceHandler: mockGetResourceHandler,
      createResourceHandler: mockCreateResourceHandler,
      logger: mockLogger,
    })),
  };
});

const createMockEvent = (
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent => {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/patient-data-manager/FHIR/R4/DocumentReference/test-id',
    pathParameters: { id: 'test-id' },
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789',
      apiId: 'api-id',
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      path: '/patient-data-manager/FHIR/R4/DocumentReference/test-id',
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'resource-id',
      resourcePath: '/patient-data-manager/FHIR/R4/DocumentReference/{id}',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      } as any,
      authorizer: null,
    } as any,
    resource: '/patient-data-manager/FHIR/R4/DocumentReference/{id}',
    ...overrides,
  } as APIGatewayProxyEvent;
};

describe('Lambda Handler Integration', () => {
  let mockAuthenticator: jest.Mock;
  let mockGetResourceHandler: jest.Mock;
  let mockCreateResourceHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    const container = createContainer();
    mockAuthenticator = container.authenticator as jest.Mock;
    mockGetResourceHandler = container.getResourceHandler as jest.Mock;
    mockCreateResourceHandler = container.createResourceHandler as jest.Mock;
  });

  it('should return authentication error when authentication fails', async () => {
    mockAuthenticator.mockResolvedValue({
      isValid: false,
      error: {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      },
    });

    const event = createMockEvent();
    const response = (await handler(
      event,
      {} as Context,
      {} as Callback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(401);
    expect(mockGetResourceHandler).not.toHaveBeenCalled();
  });

  it('should route GET requests to getResourceHandler', async () => {
    mockAuthenticator.mockResolvedValue({ isValid: true });
    mockGetResourceHandler.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ id: 'test-id' }),
    });

    const event = createMockEvent({
      httpMethod: 'GET',
      path: '/patient-data-manager/FHIR/R4/DocumentReference/test-id',
    });

    const response = (await handler(
      event,
      {} as Context,
      {} as Callback,
    )) as APIGatewayProxyResult;

    expect(mockAuthenticator).toHaveBeenCalledWith(event);
    expect(mockGetResourceHandler).toHaveBeenCalledWith(event);
    expect(response.statusCode).toBe(200);
  });

  it('should route POST requests to createResourceHandler', async () => {
    mockAuthenticator.mockResolvedValue({ isValid: true });
    mockCreateResourceHandler.mockResolvedValue({
      statusCode: 201,
      body: JSON.stringify({ id: 'new-id' }),
    });

    const event = createMockEvent({
      httpMethod: 'POST',
      path: '/patient-data-manager/FHIR/R4/DocumentReference',
      body: JSON.stringify({ data: 'test' }),
    });

    const response = (await handler(
      event,
      {} as Context,
      {} as Callback,
    )) as APIGatewayProxyResult;

    expect(mockAuthenticator).toHaveBeenCalledWith(event);
    expect(mockCreateResourceHandler).toHaveBeenCalledWith(event);
    expect(response.statusCode).toBe(201);
  });

  it('should return 404 for unsupported endpoints', async () => {
    mockAuthenticator.mockResolvedValue({ isValid: true });

    const event = createMockEvent({
      httpMethod: 'DELETE',
      path: '/unsupported',
    });

    const response = (await handler(
      event,
      {} as Context,
      {} as Callback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('not found');
  });

  it('should handle unexpected errors gracefully', async () => {
    mockAuthenticator.mockRejectedValue(new Error('Unexpected error'));

    const event = createMockEvent();
    const response = (await handler(
      event,
      {} as Context,
      {} as Callback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(500);
    expect(response.body).toContain('Internal server error');
  });
});
