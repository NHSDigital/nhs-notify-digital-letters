import { Logger } from 'utils';
import axios from 'axios';
import { constants as HTTP2_CONSTANTS } from 'node:http2';
import { PdmClient } from 'infra/pdm-api-client';

jest.mock('axios');
jest.mock('utils', () => ({
  ...jest.requireActual('utils'),
  conditionalRetry: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const { conditionalRetry } = jest.requireMock('utils');

describe('PdmClient', () => {
  let pdmClient: PdmClient;
  let mockAccessTokenRepository: any;
  let mockLogger: jest.Mocked<Logger>;
  let mockAxiosInstance: any;

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
      post: jest.fn(),
      head: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
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
    const mockRequestId = 'req-123';
    const mockCorrelationId = 'corr-456';

    it('should successfully create document reference', async () => {
      const mockResponse = { data: { id: 'doc-123' } };
      conditionalRetry.mockImplementation(async (fn: any) => fn(1));
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await pdmClient.createDocumentReference(
        mockFhirRequest,
        mockRequestId,
        mockCorrelationId,
      );

      expect(mockAccessTokenRepository.getAccessToken).toHaveBeenCalled();
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/patient-data-manager/FHIR/R4/DocumentReference',
        mockFhirRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': mockRequestId,
            'X-Correlation-ID': mockCorrelationId,
            Authorization: 'Bearer mock-access-token',
          },
        },
      );
      expect(result).toEqual(mockResponse.data);
      expect(mockLogger.debug).toHaveBeenCalledWith({
        requestId: mockRequestId,
        correlationId: mockCorrelationId,
        description: 'Sending request',
        attempt: 1,
      });
    });

    it('should handle request without correlation ID', async () => {
      const mockResponse = { data: { id: 'doc-123' } };
      conditionalRetry.mockImplementation(async (fn: any) => fn(1));
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await pdmClient.createDocumentReference(mockFhirRequest, mockRequestId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/patient-data-manager/FHIR/R4/DocumentReference',
        mockFhirRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': mockRequestId,
            'X-Correlation-ID': undefined,
            Authorization: 'Bearer mock-access-token',
          },
        },
      );
    });

    it('should handle empty access token', async () => {
      mockAccessTokenRepository.getAccessToken.mockResolvedValue('');
      const mockResponse = { data: { id: 'doc-123' } };
      conditionalRetry.mockImplementation(async (fn: any) => fn(1));
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await pdmClient.createDocumentReference(mockFhirRequest, mockRequestId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/patient-data-manager/FHIR/R4/DocumentReference',
        mockFhirRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': mockRequestId,
            'X-Correlation-ID': undefined,
          },
        },
      );
    });

    it('should retry on 429 error', async () => {
      conditionalRetry.mockImplementation(async (fn: any, shouldRetry: any) => {
        const error = {
          isAxiosError: true,
          response: { status: HTTP2_CONSTANTS.HTTP_STATUS_TOO_MANY_REQUESTS },
        };
        expect(shouldRetry(error)).toBe(true);

        // Simulate successful retry
        return fn(2);
      });

      const mockResponse = { data: { id: 'doc-123' } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await pdmClient.createDocumentReference(
        mockFhirRequest,
        mockRequestId,
        mockCorrelationId,
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should not retry on other errors', async () => {
      conditionalRetry.mockImplementation(
        async (_fn: any, shouldRetry: any) => {
          const error = {
            isAxiosError: true,
            response: { status: 500 },
          };
          expect(shouldRetry(error)).toBe(false);
        },
      );

      await pdmClient.createDocumentReference(mockFhirRequest, mockRequestId);
    });

    it('should log and throw error on failure', async () => {
      const mockError = new Error('Network error');
      conditionalRetry.mockRejectedValue(mockError);

      await expect(
        pdmClient.createDocumentReference(
          mockFhirRequest,
          mockRequestId,
          mockCorrelationId,
        ),
      ).rejects.toThrow('Network error');

      expect(mockLogger.error).toHaveBeenCalledWith({
        description: 'Failed sending PDM request',
        requestId: mockRequestId,
        correlationId: mockCorrelationId,
        err: mockError,
      });
    });
  });
});
