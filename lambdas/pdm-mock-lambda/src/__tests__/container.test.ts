import { SSMClient } from '@aws-sdk/client-ssm';
import { createContainer } from 'container';

jest.mock('utils', () => {
  const actual = jest.requireActual('utils');
  return {
    ...actual,
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      child: jest.fn(),
    },
  };
});

jest.mock('@aws-sdk/client-ssm');

describe('Container', () => {
  let container: ReturnType<typeof createContainer>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MOCK_ACCESS_TOKEN = 'test-token';
    process.env.ACCESS_TOKEN_SSM_PATH = '/test/path';
    process.env.USE_NON_MOCK_TOKEN = 'false';
    process.env.LOG_LEVEL = 'INFO';

    container = createContainer();
  });

  it('should create a container with all required dependencies', () => {
    expect(container).toBeDefined();
    expect(container.authenticator).toBeDefined();
    expect(container.getResourceHandler).toBeDefined();
    expect(container.createResourceHandler).toBeDefined();
    expect(container.logger).toBeDefined();
  });

  it('should create an authenticator function', () => {
    expect(typeof container.authenticator).toBe('function');
  });

  it('should create a getResourceHandler function', () => {
    expect(typeof container.getResourceHandler).toBe('function');
  });

  it('should create a createResourceHandler function', () => {
    expect(typeof container.createResourceHandler).toBe('function');
  });

  it('should provide a logger instance', () => {
    expect(container.logger).toBeDefined();
    expect(container.logger.info).toBeDefined();
    expect(container.logger.warn).toBeDefined();
    expect(container.logger.error).toBeDefined();
    expect(container.logger.debug).toBeDefined();
  });

  it('should create handlers that can be called', async () => {
    const mockEvent = {
      pathParameters: { id: 'test-id' },
      requestContext: { requestId: 'test-request' },
      headers: {
        'X-Request-ID': 'container-test-1234-5678-9abc-def012345678',
      },
    };

    const result = await container.getResourceHandler(mockEvent as never);
    expect(result).toBeDefined();
    expect(result.statusCode).toBeDefined();
  });

  it('should create authenticator that can be called', async () => {
    const mockEvent = {
      headers: { Authorization: 'Bearer test-token' },
    };

    const result = await container.authenticator(mockEvent);
    expect(result).toBeDefined();
    expect(result.isValid).toBeDefined();
  });

  it('should handle USE_NON_MOCK_TOKEN configuration', () => {
    process.env.USE_NON_MOCK_TOKEN = 'true';
    const containerWithSSM = createContainer();

    expect(containerWithSSM).toBeDefined();
    expect(containerWithSSM.authenticator).toBeDefined();
    expect(typeof containerWithSSM.authenticator).toBe('function');
  });

  it('should wire getAccessToken to authenticator when using SSM token', async () => {
    const mockTokenValue = JSON.stringify({
      access_token: 'ssm-stored-token',
      expires_at: 1765187843,
      token_type: 'Bearer',
    });

    const mockSend = jest.fn().mockResolvedValue({
      Parameter: { Value: mockTokenValue },
    });

    process.env.USE_NON_MOCK_TOKEN = 'true';
    process.env.ACCESS_TOKEN_SSM_PATH = '/test/token/path';
    process.env.MOCK_ACCESS_TOKEN = 'unused-mock-token';

    (SSMClient as jest.MockedClass<typeof SSMClient>).mockImplementation(
      () =>
        ({
          send: mockSend,
        }) as any,
    );

    const testContainer = createContainer();

    const result = await testContainer.authenticator({
      headers: { Authorization: 'Bearer ssm-stored-token' },
    });

    expect(result.isValid).toBe(true);
    expect(mockSend).toHaveBeenCalled();
  });

  it('should handle invalid JSON format in SSM parameter', async () => {
    const mockSend = jest.fn().mockResolvedValue({
      Parameter: { Value: 'invalid-json' },
    });

    process.env.USE_NON_MOCK_TOKEN = 'true';
    process.env.ACCESS_TOKEN_SSM_PATH = '/test/token/path';

    (SSMClient as jest.MockedClass<typeof SSMClient>).mockImplementation(
      () =>
        ({
          send: mockSend,
        }) as any,
    );

    const testContainer = createContainer();

    await expect(
      testContainer.authenticator({
        headers: { Authorization: 'Bearer any-token' },
      }),
    ).rejects.toThrow('Invalid access token format in SSM parameter');
  });
});
