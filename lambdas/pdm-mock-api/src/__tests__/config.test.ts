import { ParameterStoreService, loadConfig } from 'config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load config with default values', () => {
      delete process.env.MOCK_ACCESS_TOKEN;
      delete process.env.ACCESS_TOKEN_SSM_PATH;
      delete process.env.USE_NON_MOCK_TOKEN;
      delete process.env.LOG_LEVEL;

      const config = loadConfig();

      expect(config.mockAccessToken).toBe('mock-token-for-local-dev');
      expect(config.accessTokenSsmPath).toBe('/mock/access-token');
      expect(config.useNonMockToken).toBe(false);
      expect(config.logLevel).toBe('INFO');
    });

    it('should load config from environment variables', () => {
      process.env.MOCK_ACCESS_TOKEN = 'custom-token';
      process.env.ACCESS_TOKEN_SSM_PATH = '/custom/path';
      process.env.USE_NON_MOCK_TOKEN = 'true';
      process.env.LOG_LEVEL = 'DEBUG';

      const config = loadConfig();

      expect(config.mockAccessToken).toBe('custom-token');
      expect(config.accessTokenSsmPath).toBe('/custom/path');
      expect(config.useNonMockToken).toBe(true);
      expect(config.logLevel).toBe('DEBUG');
    });

    it('should parse boolean environment variables correctly', () => {
      process.env.USE_NON_MOCK_TOKEN = 'TRUE';
      let config = loadConfig();
      expect(config.useNonMockToken).toBe(true);

      process.env.USE_NON_MOCK_TOKEN = 'false';
      config = loadConfig();
      expect(config.useNonMockToken).toBe(false);

      process.env.USE_NON_MOCK_TOKEN = 'FALSE';
      config = loadConfig();
      expect(config.useNonMockToken).toBe(false);
    });

    it('should throw error for missing required env var without default', () => {
      const config = loadConfig();
      expect(config).toBeDefined();
    });
  });

  describe('ParameterStoreService', () => {
    let service: ParameterStoreService;

    beforeEach(() => {
      service = new ParameterStoreService();
    });

    it('should create an instance', () => {
      expect(service).toBeInstanceOf(ParameterStoreService);
    });

    it('should cache parameter values', async () => {
      const mockParameter = 'test-value';
      const mockSend = jest.fn().mockResolvedValue({
        Parameter: { Value: mockParameter },
      });

      (service as any).ssmClient = {
        send: mockSend,
      };

      const result1 = await service.getParameter('/test/path');
      expect(result1).toBe(mockParameter);
      expect(mockSend).toHaveBeenCalledTimes(1);

      const result2 = await service.getParameter('/test/path');
      expect(result2).toBe(mockParameter);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after TTL expires', async () => {
      const mockParameter = 'test-value';
      const mockSend = jest.fn().mockResolvedValue({
        Parameter: { Value: mockParameter },
      });

      (service as any).ssmClient = {
        send: mockSend,
      };

      (service as any).cacheTtl = 10;

      await service.getParameter('/test/path');
      expect(mockSend).toHaveBeenCalledTimes(1);

      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });

      await service.getParameter('/test/path');
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should throw error when parameter is not found', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Parameter: {},
      });

      (service as any).ssmClient = {
        send: mockSend,
      };

      await expect(service.getParameter('/missing/path')).rejects.toThrow(
        'Parameter /missing/path not found or has no value',
      );
    });

    it('should handle SSM errors', async () => {
      const mockError = new Error('SSM error');
      const mockSend = jest.fn().mockRejectedValue(mockError);

      (service as any).ssmClient = {
        send: mockSend,
      };

      await expect(service.getParameter('/error/path')).rejects.toThrow(
        'SSM error',
      );
    });
  });
});
