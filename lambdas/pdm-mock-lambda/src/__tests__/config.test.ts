import { loadConfig } from 'config';

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

      expect(config.mockAccessToken).toBe('mock-pdm-token');
      expect(config.accessTokenSsmPath).toBe('/dl/main/apim/access_token');
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

      process.env.USE_NON_MOCK_TOKEN = 'true';
      config = loadConfig();
      expect(config.useNonMockToken).toBe(true);

      process.env.USE_NON_MOCK_TOKEN = 'false';
      config = loadConfig();
      expect(config.useNonMockToken).toBe(false);

      process.env.USE_NON_MOCK_TOKEN = 'FALSE';
      config = loadConfig();
      expect(config.useNonMockToken).toBe(false);
    });

    it('should not throw when all required env vars have default values', () => {
      const config = loadConfig();
      expect(config).toBeDefined();
    });
  });
});
