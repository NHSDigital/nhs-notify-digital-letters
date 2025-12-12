import { randomUUID } from 'node:crypto';
import type { SQSEvent } from 'aws-lambda';
import type { EventPublisher, Logger } from 'utils';
import { createHandler } from 'apis/sqs-trigger-lambda';
import type { UploadToPdm } from 'app/upload-to-pdm';

jest.mock('node:crypto');

const mockRandomUUID = randomUUID as jest.MockedFunction<typeof randomUUID>;

const createValidSQSEvent = (overrides?: Partial<SQSEvent>): SQSEvent => ({
  Records: [
    {
      messageId: 'msg-1',
      body: JSON.stringify({
        detail: {
          id: 'a449d419-e683-4ab4-9291-a0451b5cef8e',
          specversion: '1.0',
          source:
            '/nhs/england/notify/production/primary/data-plane/digital-letters',
          subject:
            'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
          type: 'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1',
          time: '2025-01-01T00:00:00Z',
          recordedtime: '2025-01-01T00:00:00Z',
          severitynumber: 2,
          traceparent:
            '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
          datacontenttype: 'application/json',
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-mesh-inbox-message-downloaded-data.schema.json',
          severitytext: 'INFO',
          data: {
            messageReference: 'test-message-reference',
            senderId: 'test-sender-id',
            messageUri: 's3://bucket/key',
          },
        },
      }),
      receiptHandle: 'receipt-1',
      attributes: {} as any,
      messageAttributes: {},
      md5OfBody: 'md5',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:region:account:queue',
      awsRegion: 'us-east-1',
    },
  ],
  ...overrides,
});

describe('sqs-trigger-lambda', () => {
  let mockUploadToPdm: jest.Mocked<UploadToPdm>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue('3a2e9238-11f9-41ed-98e4-e519eafb1167');

    mockUploadToPdm = {
      send: jest.fn(),
    } as unknown as jest.Mocked<UploadToPdm>;

    mockEventPublisher = {
      sendEvents: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<EventPublisher>;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
  });

  describe('successful processing', () => {
    it('should process single message successfully', async () => {
      mockUploadToPdm.send.mockResolvedValue({
        outcome: 'sent',
        resourceId: 'resource-123',
      });
      const handler = createHandler({
        uploadToPdm: mockUploadToPdm,
        eventPublisher: mockEventPublisher,
        logger: mockLogger,
      });
      const sqsEvent = createValidSQSEvent();

      const result = await handler(sqsEvent);

      expect(result.batchItemFailures).toEqual([]);
      expect(mockUploadToPdm.send).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.sendEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'uk.nhs.notify.digital.letters.pdm.resource.submitted.v1',
            id: '3a2e9238-11f9-41ed-98e4-e519eafb1167',
          }),
        ]),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Processed SQS Event.',
          retrieved: 1,
          sent: 1,
          failed: 0,
        }),
      );
    });

    it('should process multiple messages successfully', async () => {
      mockUploadToPdm.send.mockResolvedValue({ outcome: 'sent' });
      const handler = createHandler({
        uploadToPdm: mockUploadToPdm,
        eventPublisher: mockEventPublisher,
        logger: mockLogger,
      });
      const sqsEvent = createValidSQSEvent({
        Records: [
          ...createValidSQSEvent().Records,
          {
            ...createValidSQSEvent().Records[0],
            messageId: 'msg-2',
          },
        ],
      });

      const result = await handler(sqsEvent);

      expect(result.batchItemFailures).toEqual([]);
      expect(mockUploadToPdm.send).toHaveBeenCalledTimes(2);
      expect(mockEventPublisher.sendEvents).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          retrieved: 2,
          sent: 2,
          failed: 0,
        }),
      );
    });
  });

  describe('failed processing', () => {
    it('should handle upload failure', async () => {
      mockUploadToPdm.send.mockResolvedValue({ outcome: 'failed' });
      const handler = createHandler({
        uploadToPdm: mockUploadToPdm,
        eventPublisher: mockEventPublisher,
        logger: mockLogger,
      });
      const sqsEvent = createValidSQSEvent();

      const result = await handler(sqsEvent);

      expect(result.batchItemFailures).toEqual([{ itemIdentifier: 'msg-1' }]);
      expect(mockEventPublisher.sendEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'uk.nhs.notify.digital.letters.pdm.resource.submission.rejected.v1',
          }),
        ]),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          retrieved: 1,
          sent: 0,
          failed: 1,
        }),
      );
    });

    it('should handle invalid message body', async () => {
      const handler = createHandler({
        uploadToPdm: mockUploadToPdm,
        eventPublisher: mockEventPublisher,
        logger: mockLogger,
      });
      const sqsEvent = createValidSQSEvent({
        Records: [
          {
            ...createValidSQSEvent().Records[0],
            body: '{"invalidKey":"invalidValue"}',
          },
        ],
      });

      const result = await handler(sqsEvent);

      expect(result.batchItemFailures).toEqual([{ itemIdentifier: 'msg-1' }]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Error parsing queue entry',
        }),
      );
    });

    it('should handle exception during upload', async () => {
      mockUploadToPdm.send.mockRejectedValue(new Error('Upload error'));
      const handler = createHandler({
        uploadToPdm: mockUploadToPdm,
        eventPublisher: mockEventPublisher,
        logger: mockLogger,
      });
      const sqsEvent = createValidSQSEvent();

      const result = await handler(sqsEvent);

      expect(result.batchItemFailures).toEqual([{ itemIdentifier: 'msg-1' }]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Error during SQS trigger handler',
          err: expect.any(Error),
        }),
      );
    });
  });

  describe('event publishing', () => {
    it('should handle partial event publishing failure for successful events', async () => {
      mockUploadToPdm.send.mockResolvedValue({
        outcome: 'sent',
        resourceId: 'resource-123',
      });
      mockEventPublisher.sendEvents.mockResolvedValue([
        { itemIdentifier: 'failed-event' },
      ] as any);
      const handler = createHandler({
        uploadToPdm: mockUploadToPdm,
        eventPublisher: mockEventPublisher,
        logger: mockLogger,
      });
      const sqsEvent = createValidSQSEvent();

      await handler(sqsEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Some successful events failed to publish',
          failedCount: 1,
          totalAttempted: 1,
        }),
      );
    });

    it('should handle event publishing exception for successful events', async () => {
      mockUploadToPdm.send.mockResolvedValue({
        outcome: 'sent',
        resourceId: 'resource-123',
      });
      mockEventPublisher.sendEvents.mockRejectedValue(
        new Error('EventBridge error'),
      );
      const handler = createHandler({
        uploadToPdm: mockUploadToPdm,
        eventPublisher: mockEventPublisher,
        logger: mockLogger,
      });
      const sqsEvent = createValidSQSEvent();

      await handler(sqsEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Failed to send successful events to EventBridge',
          eventCount: 1,
          err: expect.any(Error),
        }),
      );
    });

    it('should handle partial event publishing failure for failed events', async () => {
      mockUploadToPdm.send.mockResolvedValue({ outcome: 'failed' });
      mockEventPublisher.sendEvents.mockResolvedValue([
        { itemIdentifier: 'failed-event' },
      ] as any);
      const handler = createHandler({
        uploadToPdm: mockUploadToPdm,
        eventPublisher: mockEventPublisher,
        logger: mockLogger,
      });
      const sqsEvent = createValidSQSEvent();

      await handler(sqsEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Some failed events failed to publish',
          failedCount: 1,
          totalAttempted: 1,
        }),
      );
    });

    it('should handle event publishing exception for failed events', async () => {
      mockUploadToPdm.send.mockResolvedValue({ outcome: 'failed' });
      mockEventPublisher.sendEvents.mockRejectedValue(
        new Error('EventBridge error'),
      );
      const handler = createHandler({
        uploadToPdm: mockUploadToPdm,
        eventPublisher: mockEventPublisher,
        logger: mockLogger,
      });
      const sqsEvent = createValidSQSEvent();

      await handler(sqsEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Failed to send failed events to EventBridge',
          eventCount: 1,
          err: expect.any(Error),
        }),
      );
    });
  });

  describe('mixed outcomes', () => {
    it('should handle mix of successful and failed uploads', async () => {
      mockUploadToPdm.send
        .mockResolvedValueOnce({ outcome: 'sent', resourceId: 'resource-123' })
        .mockResolvedValueOnce({ outcome: 'failed' });
      const handler = createHandler({
        uploadToPdm: mockUploadToPdm,
        eventPublisher: mockEventPublisher,
        logger: mockLogger,
      });
      const sqsEvent = createValidSQSEvent({
        Records: [
          ...createValidSQSEvent().Records,
          {
            ...createValidSQSEvent().Records[0],
            messageId: 'msg-2',
          },
        ],
      });

      const result = await handler(sqsEvent);

      expect(result.batchItemFailures).toEqual([{ itemIdentifier: 'msg-2' }]);
      expect(mockEventPublisher.sendEvents).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          retrieved: 2,
          sent: 1,
          failed: 1,
        }),
      );
    });
  });
});
