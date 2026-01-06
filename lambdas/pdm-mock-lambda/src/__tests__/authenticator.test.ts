import type { Logger } from 'utils';
import { createAuthenticator } from 'authenticator';

const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn(),
} as any;

describe('Authenticator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with mock token', () => {
    it('should authenticate successfully with valid Bearer token', async () => {
      const authenticator = createAuthenticator(mockLogger);

      const result = await authenticator({
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject request with missing Authorization header', async () => {
      const authenticator = createAuthenticator(mockLogger);

      const result = await authenticator({ headers: {} });

      expect(result.isValid).toBe(false);
      expect(result).toHaveProperty('error');
      expect((result as { isValid: false; error: any }).error).toBeDefined();
      expect((result as { isValid: false; error: any }).error.statusCode).toBe(
        401,
      );
      expect((result as { isValid: false; error: any }).error.body).toContain(
        'ACCESS_DENIED',
      );
      expect((result as { isValid: false; error: any }).error.body).toContain(
        'Missing Authentication Token',
      );
    });

    it('should reject request with invalid token type', async () => {
      const authenticator = createAuthenticator(mockLogger);

      const result = await authenticator({
        headers: { Authorization: 'Basic test-token' },
      });

      expect(result.isValid).toBe(false);
      expect(result).toHaveProperty('error');
      expect((result as { isValid: false; error: any }).error.statusCode).toBe(
        401,
      );
      expect((result as { isValid: false; error: any }).error.body).toContain(
        'Invalid Access Token',
      );
    });

    it('should handle lowercase authorization header', async () => {
      const authenticator = createAuthenticator(mockLogger);

      const result = await authenticator({
        headers: { authorization: 'Bearer test-token' },
      });

      expect(result.isValid).toBe(true);
    });
  });
});
