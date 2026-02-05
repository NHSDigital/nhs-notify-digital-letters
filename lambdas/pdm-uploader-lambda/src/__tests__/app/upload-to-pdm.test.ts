import { mockEvent } from '__tests__/data';
import { UploadToPdm } from 'app/upload-to-pdm';
import { IPdmClient, Logger, getS3ObjectFromUri } from 'utils';

jest.mock('utils', () => ({
  ...jest.requireActual('utils'),
  getS3ObjectFromUri: jest.fn(),
}));

describe('UploadToPdm', () => {
  let mockPdmClient: jest.Mocked<IPdmClient>;
  let mockLogger: jest.Mocked<Logger>;
  let uploadToPdm: UploadToPdm;

  const mockFhirRequest = { resourceType: 'Bundle' };
  const mockPdmResponse = {
    id: 'test-resource-id',
    resourceType: 'DocumentReference',
    meta: {
      versionId: '1',
      lastUpdated: '2023-06-20T12:00:00Z',
    },
    status: 'current',
    author: [
      {
        identifier: {
          system: 'https://fhir.nhs.uk/Id/ods-organization-code',
          value: 'Y05868',
        },
      },
    ],
    subject: {
      identifier: {
        system: 'https://fhir.nhs.uk/Id/nhs-number',
        value: '1234567890',
      },
    },
    content: [],
  };

  beforeEach(() => {
    mockPdmClient = {
      createDocumentReference: jest.fn(),
    } as unknown as jest.Mocked<IPdmClient>;

    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    uploadToPdm = new UploadToPdm(mockPdmClient, mockLogger);

    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should successfully send request to PDM and return sent outcome', async () => {
      (getS3ObjectFromUri as jest.Mock).mockResolvedValue(mockFhirRequest);
      mockPdmClient.createDocumentReference.mockResolvedValue(mockPdmResponse);

      const result = await uploadToPdm.send(mockEvent);

      expect(getS3ObjectFromUri).toHaveBeenCalledWith('s3://bucket/key');
      expect(mockPdmClient.createDocumentReference).toHaveBeenCalledWith(
        mockFhirRequest,
        mockEvent.data.messageReference,
      );
      expect(result).toEqual({
        outcome: 'sent',
        resourceId: 'test-resource-id',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Successfully sent request to PDM',
          eventId: mockEvent.id,
          messageReference: mockEvent.data.messageReference,
          resourceId: 'test-resource-id',
        }),
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return failed outcome when getS3ObjectFromUri throws error', async () => {
      const error = new Error('S3 error');
      (getS3ObjectFromUri as jest.Mock).mockRejectedValue(error);

      const result = await uploadToPdm.send(mockEvent);

      expect(result).toEqual({ outcome: 'failed' });
      expect(mockLogger.error).toHaveBeenCalledWith({
        description: 'Error sending request to PDM',
        err: expect.objectContaining({
          message: error.message,
          name: error.name,
        }),
      });
      expect(mockPdmClient.createDocumentReference).not.toHaveBeenCalled();
    });

    it('should return failed outcome when getS3ObjectFromUri throws error as a different object', async () => {
      const error = {
        message: 'Some error',
      };
      (getS3ObjectFromUri as jest.Mock).mockRejectedValue(error);

      const result = await uploadToPdm.send(mockEvent);

      expect(result).toEqual({ outcome: 'failed' });
      expect(mockLogger.error).toHaveBeenCalledWith({
        description: 'Error sending request to PDM',
        err: expect.objectContaining({
          message: error.message,
        }),
      });
      expect(mockPdmClient.createDocumentReference).not.toHaveBeenCalled();
    });

    it('should return failed outcome when PDM client throws error', async () => {
      const error = new Error('PDM error');
      (getS3ObjectFromUri as jest.Mock).mockResolvedValue(mockFhirRequest);
      mockPdmClient.createDocumentReference.mockRejectedValue(error);

      const result = await uploadToPdm.send(mockEvent);

      expect(result).toEqual({ outcome: 'failed' });
      expect(mockLogger.error).toHaveBeenCalledWith({
        description: 'Error sending request to PDM',
        err: expect.objectContaining({
          message: error.message,
          name: error.name,
        }),
      });
    });
  });
});
