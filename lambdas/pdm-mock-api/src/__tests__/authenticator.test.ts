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
  let mockGetAccessToken: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccessToken = jest.fn();
  });

  describe('with mock token', () => {
    it('should authenticate successfully with valid Bearer token', async () => {
      const authenticator = createAuthenticator(
        {
          mockAccessToken: 'test-token',
          useNonMockToken: false,
          getAccessToken: mockGetAccessToken,
        },
        mockLogger,
      );

      const result = await authenticator({
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockGetAccessToken).not.toHaveBeenCalled();
    });

    it('should reject request with missing Authorization header', async () => {
      const authenticator = createAuthenticator(
        {
          mockAccessToken: 'test-token',
          useNonMockToken: false,
          getAccessToken: mockGetAccessToken,
        },
        mockLogger,
      );

      const result = await authenticator({ headers: {} });

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.statusCode).toBe(401);
      expect(result.error?.body).toContain('ACCESS_DENIED');
      expect(result.error?.body).toContain('Missing Authentication Token');
    });

    it('should reject request with invalid token type', async () => {
      const authenticator = createAuthenticator(
        {
          mockAccessToken: 'test-token',
          useNonMockToken: false,
          getAccessToken: mockGetAccessToken,
        },
        mockLogger,
      );

      const result = await authenticator({
        headers: { Authorization: 'Basic test-token' },
      });

      expect(result.isValid).toBe(false);
      expect(result.error?.statusCode).toBe(401);
      expect(result.error?.body).toContain('Invalid Access Token');
    });

    it('should reject request with invalid token value', async () => {
      const authenticator = createAuthenticator(
        {
          mockAccessToken: 'test-token',
          useNonMockToken: false,
          getAccessToken: mockGetAccessToken,
        },
        mockLogger,
      );

      const result = await authenticator({
        headers: { Authorization: 'Bearer wrong-token' },
      });

      expect(result.isValid).toBe(false);
      expect(result.error?.statusCode).toBe(401);
      expect(result.error?.body).toContain('Invalid Access Token');
    });

    it('should handle lowercase authorization header', async () => {
      const authenticator = createAuthenticator(
        {
          mockAccessToken: 'test-token',
          useNonMockToken: false,
          getAccessToken: mockGetAccessToken,
        },
        mockLogger,
      );

      const result = await authenticator({
        headers: { authorization: 'Bearer test-token' },
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('with non-mock token', () => {
    it('should authenticate successfully with SSM token', async () => {
      mockGetAccessToken.mockResolvedValue('ssm-token');

      const authenticator = createAuthenticator(
        {
          mockAccessToken: 'test-token',
          useNonMockToken: true,
          getAccessToken: mockGetAccessToken,
        },
        mockLogger,
      );

      const result = await authenticator({
        headers: { Authorization: 'Bearer ssm-token' },
      });

      expect(result.isValid).toBe(true);
      expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should reject request with mock token when non-mock token is required', async () => {
      mockGetAccessToken.mockResolvedValue('ssm-token');

      const authenticator = createAuthenticator(
        {
          mockAccessToken: 'test-token',
          useNonMockToken: true,
          getAccessToken: mockGetAccessToken,
        },
        mockLogger,
      );

      const result = await authenticator({
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(result.isValid).toBe(false);
      expect(result.error?.statusCode).toBe(401);
    });

    it('should handle SSM token retrieval errors gracefully', async () => {
      mockGetAccessToken.mockRejectedValue(new Error('SSM error'));

      const authenticator = createAuthenticator(
        {
          mockAccessToken: 'test-token',
          useNonMockToken: true,
          getAccessToken: mockGetAccessToken,
        },
        mockLogger,
      );

      await expect(
        authenticator({
          headers: { Authorization: 'Bearer test-token' },
        }),
      ).rejects.toThrow('SSM error');
    });
  });
});
