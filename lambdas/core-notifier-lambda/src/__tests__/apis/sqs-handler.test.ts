import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { mock } from 'jest-mock-extended';
import { Logger, Sender } from 'utils';
import { PDMResourceAvailable } from 'digital-letters-events';
import { NotifyMessageProcessor } from 'app/notify-message-processor';
import { SenderManagement } from 'sender-management';
import { EventPublisherFacade } from 'infra/event-publisher-facade';
import { SqsHandlerDependencies, createHandler } from 'apis/sqs-handler';
import { parseSqsRecord } from 'app/parse-sqs-message';
import { InvalidPdmResourceAvailableEvent } from 'domain/invalid-pdm-resource-available-event';
import { RequestNotifyError } from 'domain/request-notify-error';

jest.mock('app/parse-sqs-message');

const mockLogger = mock<Logger>();
const mockNotifyMessageProcessor = mock<NotifyMessageProcessor>();
const mockSenderManagement = mock<SenderManagement>();
const mockEventPublisherFacade = mock<EventPublisherFacade>();
const mockParseSqsRecord = jest.mocked(parseSqsRecord);

describe('createHandler', () => {
  const dependencies: SqsHandlerDependencies = {
    logger: mockLogger,
    notifyMessageProcessor: mockNotifyMessageProcessor,
    senderManagement: mockSenderManagement,
    eventPublisherFacade: mockEventPublisherFacade,
  };

  const senderId = 'sender-123';
  const routingConfigId = 'routing-config-123';
  const messageReference = 'msg-ref-123';
  const notifyId = 'notify-id-123';

  const mockSender: Sender = {
    senderId,
    routingConfigId,
    displayName: 'Test Sender',
    clientId: 'client-123',
    campaignId: 'campaign-123',
  };

  const mockPdmEvent: PDMResourceAvailable = {
    id: 'event-id-123',
    source: 'urn:nhs:names:services:notify:pdm',
    specversion: '1.0',
    type: 'uk.nhs.notify.pdm.resource.available',
    time: '2025-12-15T10:00:00Z',
    datacontenttype: 'application/json',
    data: {
      senderId,
      messageReference,
      resourceType: 'letter',
      resourceLocation: 's3://bucket/key',
    },
  };

  const createSqsRecord = (messageId: string): SQSRecord => ({
    messageId,
    receiptHandle: 'receipt-handle',
    body: JSON.stringify({
      detail: mockPdmEvent,
    }),
    attributes: {
      ApproximateReceiveCount: '1',
      SentTimestamp: '1234567890',
      SenderId: 'sender-id',
      ApproximateFirstReceiveTimestamp: '1234567890',
    },
    messageAttributes: {},
    md5OfBody: 'md5',
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:region:account:queue',
    awsRegion: 'eu-west-2',
  });

  const createSqsEvent = (recordCount: number): SQSEvent => ({
    Records: Array.from({ length: recordCount }, (_, i) =>
      createSqsRecord(`message-id-${i + 1}`),
    ),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when processing a single successful SQS record', () => {
    it('processes the message and returns no batch item failures', async () => {
      const sqsEvent = createSqsEvent(1);
      const handler = createHandler(dependencies);

      mockParseSqsRecord.mockReturnValueOnce(mockPdmEvent);
      mockSenderManagement.getSender.mockReturnValueOnce(mockSender);
      mockNotifyMessageProcessor.process.mockResolvedValueOnce(notifyId);

      const result = await handler(sqsEvent);

      expect(result).toEqual({ batchItemFailures: [] });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Received SQS Event of 1 record(s)',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '1 of 1 records processed successfully',
      );
      expect(mockParseSqsRecord).toHaveBeenCalledWith(
        sqsEvent.Records[0],
        mockLogger,
      );
      expect(mockSenderManagement.getSender).toHaveBeenCalledWith(senderId);
      expect(mockNotifyMessageProcessor.process).toHaveBeenCalledTimes(1);
      expect(
        mockEventPublisherFacade.publishMessageRequestSubmitted,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('when sender has no routing config', () => {
    it('skips the message and publishes a skipped event', async () => {
      const sqsEvent = createSqsEvent(1);
      const handler = createHandler(dependencies);
      const senderWithoutRouting: Sender = {
        ...mockSender,
        routingConfigId: undefined,
      };

      mockParseSqsRecord.mockReturnValueOnce(mockPdmEvent);
      mockSenderManagement.getSender.mockReturnValueOnce(senderWithoutRouting);

      const result = await handler(sqsEvent);

      expect(result).toEqual({ batchItemFailures: [] });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `No routing config for sender ${senderId}, skipping message`,
      );
      expect(mockNotifyMessageProcessor.process).not.toHaveBeenCalled();
      expect(
        mockEventPublisherFacade.publishMessageRequestSkipped,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('when processing multiple SQS records', () => {
    it('processes all records successfully', async () => {
      const sqsEvent = createSqsEvent(3);
      const handler = createHandler(dependencies);

      mockParseSqsRecord.mockReturnValue(mockPdmEvent);
      mockSenderManagement.getSender.mockReturnValue(mockSender);
      mockNotifyMessageProcessor.process.mockResolvedValue(notifyId);

      const result = await handler(sqsEvent);

      expect(result).toEqual({ batchItemFailures: [] });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Received SQS Event of 3 record(s)',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '3 of 3 records processed successfully',
      );
      expect(mockParseSqsRecord).toHaveBeenCalledTimes(3);
      expect(mockNotifyMessageProcessor.process).toHaveBeenCalledTimes(3);
    });
  });

  describe('when parseSqsRecord throws InvalidPdmResourceAvailableEvent', () => {
    it('marks the message as failed for retry', async () => {
      const sqsEvent = createSqsEvent(1);
      const handler = createHandler(dependencies);
      const { messageId } = sqsEvent.Records[0];

      mockParseSqsRecord.mockImplementationOnce(() => {
        throw new InvalidPdmResourceAvailableEvent(messageId);
      });

      const result = await handler(sqsEvent);

      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: messageId }],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith({
        error: 'Unable to parse PDMResourceAvailable event from SQS message',
        description: 'Failed processing message',
        messageId,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '0 of 1 records processed successfully',
      );
    });
  });

  describe('when processing throws RequestNotifyError', () => {
    it('marks the message as failed for retry since error lacks messageReference', async () => {
      const sqsEvent = createSqsEvent(1);
      const handler = createHandler(dependencies);
      const { messageId } = sqsEvent.Records[0];
      const errorCode = 'VALIDATION_ERROR';
      const correlationId = 'corr-123';
      const error = new RequestNotifyError(
        new Error('Validation failed'),
        correlationId,
        errorCode,
      );

      mockParseSqsRecord.mockReturnValueOnce(mockPdmEvent);
      mockSenderManagement.getSender.mockReturnValueOnce(mockSender);
      mockNotifyMessageProcessor.process.mockRejectedValueOnce(error);

      const result = await handler(sqsEvent);

      // Since RequestNotifyError doesn't have messageReference property,
      // it falls through to the else branch and is treated as a transient error
      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: messageId }],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith({
        error: error.message,
        description: 'Failed processing message',
        messageId,
      });
      expect(
        mockEventPublisherFacade.publishMessageRequestRejected,
      ).not.toHaveBeenCalled();
    });

    it('publishes rejected event when error has messageReference property', async () => {
      const sqsEvent = createSqsEvent(1);
      const handler = createHandler(dependencies);
      const { messageId } = sqsEvent.Records[0];
      const errorCode = 'VALIDATION_ERROR';
      const correlationId = 'corr-123';
      const error = new RequestNotifyError(
        new Error('Validation failed'),
        correlationId,
        errorCode,
      );
      // Add messageReference property dynamically to trigger the terminal error path
      (error as any).messageReference = messageReference;

      mockParseSqsRecord.mockReturnValueOnce(mockPdmEvent);
      mockSenderManagement.getSender.mockReturnValueOnce(mockSender);
      mockNotifyMessageProcessor.process.mockRejectedValueOnce(error);

      const result = await handler(sqsEvent);

      // With messageReference property, it's treated as terminal error and not retried
      expect(result).toEqual({ batchItemFailures: [] });
      expect(mockLogger.warn).toHaveBeenCalledWith({
        error: error.message,
        description: 'Failed processing message',
        messageId,
      });
      expect(
        mockEventPublisherFacade.publishMessageRequestRejected,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockEventPublisherFacade.publishMessageRequestRejected,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            senderId,
            messageReference,
            failureCode: errorCode,
          }),
        }),
      );
    });
  });

  describe('when processing throws a generic error', () => {
    it('marks the message as failed for retry', async () => {
      const sqsEvent = createSqsEvent(1);
      const handler = createHandler(dependencies);
      const { messageId } = sqsEvent.Records[0];
      const error = new Error('Unexpected error');

      mockParseSqsRecord.mockReturnValueOnce(mockPdmEvent);
      mockSenderManagement.getSender.mockReturnValueOnce(mockSender);
      mockNotifyMessageProcessor.process.mockRejectedValueOnce(error);

      const result = await handler(sqsEvent);

      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: messageId }],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith({
        error: error.message,
        description: 'Failed processing message',
        messageId,
      });
      expect(
        mockEventPublisherFacade.publishMessageRequestRejected,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when processing mixed success and failure records', () => {
    it('returns only failed message IDs', async () => {
      const sqsEvent = createSqsEvent(3);
      const handler = createHandler(dependencies);

      mockParseSqsRecord
        .mockReturnValueOnce(mockPdmEvent)
        .mockImplementationOnce(() => {
          throw new Error('Parse error');
        })
        .mockReturnValueOnce(mockPdmEvent);

      mockSenderManagement.getSender.mockReturnValue(mockSender);
      mockNotifyMessageProcessor.process.mockResolvedValue(notifyId);

      const result = await handler(sqsEvent);

      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: 'message-id-2' }],
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '2 of 3 records processed successfully',
      );
    });
  });

  describe('when notifyMessageProcessor returns undefined', () => {
    it('does not publish submitted event', async () => {
      const sqsEvent = createSqsEvent(1);
      const handler = createHandler(dependencies);

      mockParseSqsRecord.mockReturnValueOnce(mockPdmEvent);
      mockSenderManagement.getSender.mockReturnValueOnce(mockSender);
      mockNotifyMessageProcessor.process.mockResolvedValueOnce();

      const result = await handler(sqsEvent);

      expect(result).toEqual({ batchItemFailures: [] });
      expect(
        mockEventPublisherFacade.publishMessageRequestSubmitted,
      ).not.toHaveBeenCalled();
    });
  });
});
