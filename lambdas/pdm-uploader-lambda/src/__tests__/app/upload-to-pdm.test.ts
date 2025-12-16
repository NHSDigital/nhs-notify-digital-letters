import { UploadToPdm } from 'app/upload-to-pdm';
import { MESHInboxMessageDownloaded } from 'digital-letters-events';
import { IPdmClient } from 'infra/pdm-api-client';
import { Logger, getS3ObjectFromUri } from 'utils';

jest.mock('utils', () => ({
  ...jest.requireActual('utils'),
  getS3ObjectFromUri: jest.fn(),
}));

describe('UploadToPdm', () => {
  let mockPdmClient: jest.Mocked<IPdmClient>;
  let mockLogger: jest.Mocked<Logger>;
  let uploadToPdm: UploadToPdm;

  const mockEvent: MESHInboxMessageDownloaded = {
    id: 'test-event-id',
    specversion: '1.0',
    source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    type: 'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1',
    time: '2023-06-20T12:00:00Z',
    recordedtime: '2023-06-20T12:00:00.250Z',
    severitynumber: 2,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-mesh-inbox-message-downloaded-data.schema.json',
    severitytext: 'INFO',
    data: {
      messageReference: 'test-message-reference',
      senderId: 'test-sender-id',
      messageUri: 's3://bucket/key',
    },
  };

  const mockFhirRequest = { resourceType: 'Bundle' };
  const mockPdmResponse = {
    id: 'test-resource-id',
    resourceType: 'DocumentReference',
    meta: {
      versionId: '1',
      lastUpdated: '2023-06-20T12:00:00Z',
    },
    status: 'current',
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
        expect.any(String),
        'test-event-id',
      );
      expect(result).toEqual({
        outcome: 'sent',
        resourceId: 'test-resource-id',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Successfully sent request to PDM',
          eventId: 'test-event-id',
          messageReference: 'test-message-reference',
          resourceId: 'test-resource-id',
        }),
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should generate unique requestId for each call', async () => {
      (getS3ObjectFromUri as jest.Mock).mockResolvedValue(mockFhirRequest);
      mockPdmClient.createDocumentReference.mockResolvedValue(mockPdmResponse);

      await uploadToPdm.send(mockEvent);
      await uploadToPdm.send(mockEvent);

      const { calls } = mockPdmClient.createDocumentReference.mock;
      expect(calls[0][1]).not.toEqual(calls[1][1]);
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

    it('should pass event id to PDM client', async () => {
      (getS3ObjectFromUri as jest.Mock).mockResolvedValue(mockFhirRequest);
      mockPdmClient.createDocumentReference.mockResolvedValue(mockPdmResponse);

      await uploadToPdm.send(mockEvent);

      expect(mockPdmClient.createDocumentReference).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'test-event-id',
      );
    });
  });
});
