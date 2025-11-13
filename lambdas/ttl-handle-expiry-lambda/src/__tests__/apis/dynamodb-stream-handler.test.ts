import type { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { EventPublisher, Logger } from 'utils';
import { mock } from 'jest-mock-extended';
import { createHandler } from 'apis/dynamodb-stream-handler';
import { Dlq } from 'app/dlq';

const logger = mock<Logger>();
const eventPublisher = mock<EventPublisher>();
const dlq = mock<Dlq>();
const futureTimestamp = Date.now() + 1_000_000;

const mockEvent: DynamoDBStreamEvent = {
  Records: [
    {
      eventID: 'test-event-1',
      eventName: 'REMOVE',
      eventVersion: '1.1',
      eventSource: 'aws:dynamodb',
      awsRegion: 'us-east-1',
      dynamodb: {
        ApproximateCreationDateTime: 1_234_567_890,
        Keys: {
          PK: { S: 'MESSAGE#test-id-1' },
          SK: { S: 'METADATA' },
        },
        OldImage: {
          PK: { S: 'MESSAGE#test-id-1' },
          SK: { S: 'METADATA' },
          dateOfExpiry: { S: 'dateOfExpiry' },
          messageReference: { S: 'ref1' },
          ttl: { N: futureTimestamp.toString() },
          senderId: { S: 'sender1' },
        },
        SequenceNumber: '123456789',
        SizeBytes: 100,
        StreamViewType: 'OLD_IMAGE',
      },
    },
  ] as DynamoDBRecord[],
};

describe('createHandler', () => {
  const handler = createHandler({
    dlq,
    eventPublisher,
    logger,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    dlq.send.mockResolvedValue([]);
  });

  it('should process DynamoDB stream event with valid TTL expired records (withdrawn=undefined)', async () => {
    const result = await handler(mockEvent);

    expect(logger.info).toHaveBeenCalledWith({
      description: 'DynamoDB event received',
      event: mockEvent,
    });

    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processing DynamoDB event record',
      record: mockEvent.Records[0],
    });

    expect(logger.info).toHaveBeenCalledWith(
      'Finished processing DynamoDB event',
      expect.objectContaining({}),
    );

    expect(eventPublisher.sendEvents).toHaveBeenCalledTimes(1);

    expect(eventPublisher.sendEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        profileversion: '1.0.0',
        profilepublished: '2025-10',
        specversion: '1.0',
        source:
          '/nhs/england/notify/production/primary/data-plane/digital-letters',
        subject:
          'customer/00000000-0000-0000-0000-000000000000/recipient/00000000-0000-0000-0000-000000000000',
        type: 'uk.nhs.notify.digital.letters.queue.item.dequeued.v1',
        datacontenttype: 'application/json',
        dataschema:
          'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letter-base-data.schema.json',
        data: expect.objectContaining({
          'digital-letter-id': expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          ),
          messageReference: 'ref1',
          messageUri: 'MESSAGE#test-id-1',
          senderId: 'sender1',
        }),
      }),
    ]);

    expect(result).toEqual({});
  });

  it('should handle non-REMOVE events by skipping them', async () => {
    const mockInsertEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventID: 'test-event-1',
          eventName: 'INSERT',
          eventVersion: '1.1',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            ApproximateCreationDateTime: 1_234_567_890,
            SequenceNumber: '123456789',
            SizeBytes: 100,
            StreamViewType: 'NEW_IMAGE',
          },
        },
      ] as DynamoDBRecord[],
    };

    const result = await handler(mockInsertEvent);

    expect(logger.error).toHaveBeenCalledWith({
      description: 'Non-REMOVE event or missing OldImage',
    });

    expect(eventPublisher.sendEvents).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('should handle records without OldImage by skipping them', async () => {
    const mockNoOldImageEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventID: 'test-event-1',
          eventName: 'REMOVE',
          eventVersion: '1.1',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            ApproximateCreationDateTime: 1_234_567_890,
            Keys: {
              PK: { S: 'MESSAGE#test-id-1' },
            },
            SequenceNumber: '123456789',
            SizeBytes: 100,
            StreamViewType: 'KEYS_ONLY',
          },
        },
      ] as DynamoDBRecord[],
    };

    const result = await handler(mockNoOldImageEvent);

    expect(logger.error).toHaveBeenCalledWith({
      description: 'Non-REMOVE event or missing OldImage',
    });

    expect(eventPublisher.sendEvents).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('should handle processing errors by sending to DLQ', async () => {
    const mockInvalidEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventID: 'test-event-1',
          eventName: 'REMOVE',
          eventVersion: '1.1',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            ApproximateCreationDateTime: 1_234_567_890,
            Keys: {
              id: { S: 'test-id-1' },
            },
            OldImage: {
              invalidField: { S: 'invalid-data' },
            },
            SequenceNumber: '123456789',
            SizeBytes: 100,
            StreamViewType: 'OLD_IMAGE',
          },
        },
      ] as DynamoDBRecord[],
    };

    const result = await handler(mockInvalidEvent);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Object),
        description: 'Error parsing ttl dynamodb record',
      }),
    );

    expect(dlq.send).toHaveBeenCalledWith([mockInvalidEvent.Records[0]]);
    expect(eventPublisher.sendEvents).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('should handle empty records array', async () => {
    const mockNoRecordsEvent: DynamoDBStreamEvent = {
      Records: [],
    };

    const result = await handler(mockNoRecordsEvent);

    expect(logger.info).toHaveBeenCalledWith({
      description: 'DynamoDB event received',
      event: mockNoRecordsEvent,
    });

    expect(logger.info).toHaveBeenCalledWith(
      'Finished processing DynamoDB event',
      result,
    );

    expect(eventPublisher.sendEvents).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('should handle EventPublisher errors by sending to DLQ', async () => {
    const error = new Error('EventPublisher failed');
    eventPublisher.sendEvents.mockRejectedValueOnce(error);

    const result = await handler(mockEvent);

    expect(logger.warn).toHaveBeenCalledWith({
      err: error,
      description: 'Error processing ttl dynamodb record',
    });

    expect(dlq.send).toHaveBeenCalledWith([mockEvent.Records[0]]);
    expect(result).toEqual({});
  });

  it('should handle DLQ failures by adding to batch failures', async () => {
    const mockInvalidEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventID: 'test-event-1',
          eventName: 'REMOVE',
          eventVersion: '1.1',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            ApproximateCreationDateTime: 1_234_567_890,
            Keys: {
              id: { S: 'test-id-1' },
            },
            OldImage: {
              invalidField: { S: 'invalid-data' },
            },
            SequenceNumber: '123456789',
            SizeBytes: 100,
            StreamViewType: 'OLD_IMAGE',
          },
        },
      ] as DynamoDBRecord[],
    };

    dlq.send.mockResolvedValueOnce([mockInvalidEvent.Records[0]]);

    const result = await handler(mockInvalidEvent);

    expect(dlq.send).toHaveBeenCalledWith([mockInvalidEvent.Records[0]]);
    expect(result).toEqual({
      batchItemFailures: [{ itemIdentifier: '123456789' }],
    });
  });

  it('should not send event when item is withdrawn (withdrawn=true)', async () => {
    const mockWithdrawnEvent: DynamoDBStreamEvent = {
      ...mockEvent,
      Records: [
        {
          ...mockEvent.Records[0],
          dynamodb: {
            ...mockEvent.Records[0].dynamodb,
            OldImage: {
              ...mockEvent.Records[0].dynamodb!.OldImage,
              withdrawn: { BOOL: true },
            },
          },
        },
      ],
    };

    const result = await handler(mockWithdrawnEvent);

    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processing DynamoDB event record',
      record: mockWithdrawnEvent.Records[0],
    });

    expect(logger.info).toHaveBeenCalledWith({
      description: 'ItemDequeued event not sent as item withdrawn',
      messageReference: 'ref1',
      messageUri: 'MESSAGE#test-id-1',
      senderId: 'sender1',
    });

    expect(eventPublisher.sendEvents).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('should send event when item is not withdrawn (withdrawn=false)', async () => {
    const mockNotWithdrawnEvent: DynamoDBStreamEvent = {
      ...mockEvent,
      Records: [
        {
          ...mockEvent.Records[0],
          dynamodb: {
            ...mockEvent.Records[0].dynamodb,
            OldImage: {
              ...mockEvent.Records[0].dynamodb!.OldImage,
              withdrawn: { BOOL: false },
            },
          },
        },
      ],
    };

    const result = await handler(mockNotWithdrawnEvent);

    expect(eventPublisher.sendEvents).toHaveBeenCalledTimes(1);
    expect(eventPublisher.sendEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'uk.nhs.notify.digital.letters.queue.item.dequeued.v1',
        data: expect.objectContaining({
          messageReference: 'ref1',
          messageUri: 'MESSAGE#test-id-1',
          senderId: 'sender1',
        }),
      }),
    ]);
    expect(result).toEqual({});
  });
});
