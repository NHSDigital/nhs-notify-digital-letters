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
    parameterStore: {
      getParameter: jest.fn(),
    },
  };
});

describe('Container', () => {
  let container: ReturnType<typeof createContainer>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.LOG_LEVEL = 'INFO';

    container = createContainer();
  });

  afterEach(() => {
    process.env = originalEnv;
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
});
