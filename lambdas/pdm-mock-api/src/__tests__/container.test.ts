import { createContainer } from 'container';

jest.mock('utils', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  },
}));

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
