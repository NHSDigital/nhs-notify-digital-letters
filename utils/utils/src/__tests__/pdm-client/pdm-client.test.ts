import axios from 'axios';
import { constants as HTTP2_CONSTANTS } from 'node:http2';
import { Logger } from '../../logger';
import { PdmClient } from '../../pdm-client';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PdmClient', () => {
  let pdmClient: PdmClient;
  let mockAccessTokenRepository: { getAccessToken: jest.Mock };
  let mockLogger: jest.Mocked<Logger>;
  let mockAxiosInstance: {
    get: jest.Mock;
    head: jest.Mock;
    post: jest.Mock;
  };
  const mockDocumentResourceId = 'doc-123';
  const mockResponse = { data: { id: mockDocumentResourceId } };
  const mockRequestId = 'req-123';

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    mockAccessTokenRepository = {
      getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
    };

    mockAxiosInstance = {
      get: jest.fn(),
      head: jest.fn(),
      post: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    mockedAxios.isAxiosError.mockImplementation(
      (error: any) => error.isAxiosError === true,
    );

    pdmClient = new PdmClient(
      'https://api.example.com',
      mockAccessTokenRepository,
      mockLogger,
    );
  });

  describe('constructor', () => {
    it('should create axios instance with base URL', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.example.com',
      });
    });
  });

  describe('createDocumentReference', () => {
    const mockFhirRequest = JSON.stringify({
      resourceType: 'DocumentReference',
    });

    it('should successfully create document reference', async () => {
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await pdmClient.createDocumentReference(
        mockFhirRequest,
        mockRequestId,
      );

      expect(result).toEqual(mockResponse.data);
      expect(mockAccessTokenRepository.getAccessToken).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/patient-data-manager/FHIR/R4/DocumentReference',
        mockFhirRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': mockRequestId,
            Authorization: 'Bearer mock-access-token',
          },
        },
      );
      expect(mockLogger.debug).toHaveBeenCalledWith({
        requestId: mockRequestId,
        description: 'Sending request',
        attempt: 1,
      });
    });

    it('should omit Authorization header when access token is empty', async () => {
      mockAccessTokenRepository.getAccessToken.mockResolvedValue('');
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await pdmClient.createDocumentReference(mockFhirRequest, mockRequestId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/patient-data-manager/FHIR/R4/DocumentReference',
        mockFhirRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': mockRequestId,
          },
        },
      );
    });

    it('should retry on 429 rate limit errors', async () => {
      const mockError = {
        isAxiosError: true,
        response: { status: HTTP2_CONSTANTS.HTTP_STATUS_TOO_MANY_REQUESTS },
      };

      mockAxiosInstance.post
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockResponse);

      const result = await pdmClient.createDocumentReference(
        mockFhirRequest,
        mockRequestId,
      );

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
      expect(mockLogger.debug).toHaveBeenCalledTimes(3);
      expect(mockLogger.debug).toHaveBeenNthCalledWith(1, {
        requestId: mockRequestId,
        description: 'Sending request',
        attempt: 1,
      });
      expect(mockLogger.debug).toHaveBeenNthCalledWith(3, {
        requestId: mockRequestId,
        description: 'Sending request',
        attempt: 3,
      });
    });

    it('should not retry on 500 server errors', async () => {
      const mockError = {
        isAxiosError: true,
        response: { status: 500 },
      };
      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(
        pdmClient.createDocumentReference(mockFhirRequest, mockRequestId),
      ).rejects.toEqual(mockError);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith({
        description: 'Failed sending PDM request',
        requestId: mockRequestId,
        err: mockError,
      });
    });

    it('should not retry on non-axios errors', async () => {
      const mockError = new Error('Network error');
      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(
        pdmClient.createDocumentReference(mockFhirRequest, mockRequestId),
      ).rejects.toThrow('Network error');

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith({
        description: 'Failed sending PDM request',
        requestId: mockRequestId,
        err: mockError,
      });
    });

    it('should respect maxAttempts in retry config', async () => {
      const mockError = {
        isAxiosError: true,
        response: { status: HTTP2_CONSTANTS.HTTP_STATUS_TOO_MANY_REQUESTS },
      };
      mockAxiosInstance.post.mockRejectedValue(mockError);

      const pdmClientWithCustomRetry = new PdmClient(
        'https://api.example.com',
        mockAccessTokenRepository,
        mockLogger,
        { maxDelayMs: 100, intervalMs: 10, exponentialRate: 1, maxAttempts: 3 },
      );

      await expect(
        pdmClientWithCustomRetry.createDocumentReference(
          mockFhirRequest,
          mockRequestId,
        ),
      ).rejects.toEqual(mockError);

      // Should attempt 3 times then give up
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('getDocumentReference', () => {
    it('should successfully fetch document reference', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await pdmClient.getDocumentReference(
        mockDocumentResourceId,
        mockRequestId,
      );

      expect(result).toEqual(mockResponse.data);
      expect(mockAccessTokenRepository.getAccessToken).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/patient-data-manager/FHIR/R4/DocumentReference/${mockDocumentResourceId}`,
        {
          headers: {
            'X-Request-ID': mockRequestId,
            Authorization: 'Bearer mock-access-token',
          },
        },
      );
      expect(mockLogger.debug).toHaveBeenCalledWith({
        requestId: mockRequestId,
        description: 'Sending request',
        attempt: 1,
      });
    });

    it('should omit Authorization header when access token is empty', async () => {
      mockAccessTokenRepository.getAccessToken.mockResolvedValue('');
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await pdmClient.getDocumentReference(
        mockDocumentResourceId,
        mockRequestId,
      );

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/patient-data-manager/FHIR/R4/DocumentReference/${mockDocumentResourceId}`,
        {
          headers: {
            'X-Request-ID': mockRequestId,
          },
        },
      );
    });

    it('should retry on 429 rate limit errors', async () => {
      const mockError = {
        isAxiosError: true,
        response: { status: HTTP2_CONSTANTS.HTTP_STATUS_TOO_MANY_REQUESTS },
      };

      mockAxiosInstance.get
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockResponse);

      const result = await pdmClient.getDocumentReference(
        mockDocumentResourceId,
        mockRequestId,
      );

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(mockLogger.debug).toHaveBeenCalledTimes(3);
      expect(mockLogger.debug).toHaveBeenNthCalledWith(1, {
        requestId: mockRequestId,
        description: 'Sending request',
        attempt: 1,
      });
      expect(mockLogger.debug).toHaveBeenNthCalledWith(3, {
        requestId: mockRequestId,
        description: 'Sending request',
        attempt: 3,
      });
    });

    it('should not retry on 500 server errors', async () => {
      const mockError = {
        isAxiosError: true,
        response: { status: 500 },
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(
        pdmClient.getDocumentReference(mockDocumentResourceId, mockRequestId),
      ).rejects.toEqual(mockError);

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith({
        description: 'Failed sending PDM request',
        requestId: mockRequestId,
        err: mockError,
      });
    });

    it('should not retry on non-axios errors', async () => {
      const mockError = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(
        pdmClient.getDocumentReference(mockDocumentResourceId, mockRequestId),
      ).rejects.toThrow('Network error');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith({
        description: 'Failed sending PDM request',
        requestId: mockRequestId,
        err: mockError,
      });
    });

    it('should respect maxAttempts in retry config', async () => {
      const mockError = {
        isAxiosError: true,
        response: { status: HTTP2_CONSTANTS.HTTP_STATUS_TOO_MANY_REQUESTS },
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      const pdmClientWithCustomRetry = new PdmClient(
        'https://api.example.com',
        mockAccessTokenRepository,
        mockLogger,
        { maxDelayMs: 100, intervalMs: 10, exponentialRate: 1, maxAttempts: 3 },
      );

      await expect(
        pdmClientWithCustomRetry.getDocumentReference(
          mockDocumentResourceId,
          mockRequestId,
        ),
      ).rejects.toEqual(mockError);

      // Should attempt 3 times then give up
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });
  });
});
