import type { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { EventPublisher, Logger } from 'utils';
import { mock } from 'jest-mock-extended';
import { createHandler } from 'apis/dynamodb-stream-handler';

const logger = mock<Logger>();
const eventPublisher = mock<EventPublisher>();

describe('createHandler', () => {
  const handler = createHandler({
    eventPublisher,
    logger,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process DynamoDB stream event with multiple records', async () => {
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
              id: { S: 'test-id-1' },
            },
            OldImage: {
              id: { S: 'test-id-1' },
              ttl: { N: '1234567890' },
              data: { S: 'test-data-1' },
            },
            SequenceNumber: '123456789',
            SizeBytes: 100,
            StreamViewType: 'OLD_IMAGE',
          },
        },
        {
          eventID: 'test-event-2',
          eventName: 'REMOVE',
          eventVersion: '1.1',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: {
            ApproximateCreationDateTime: 1_234_567_891,
            Keys: {
              id: { S: 'test-id-2' },
            },
            OldImage: {
              id: { S: 'test-id-2' },
              ttl: { N: '1234567891' },
              data: { S: 'test-data-2' },
            },
            SequenceNumber: '123456790',
            SizeBytes: 110,
            StreamViewType: 'OLD_IMAGE',
          },
        },
      ] as DynamoDBRecord[],
    };

    const result = await handler(mockEvent);

    expect(logger.info).toHaveBeenCalledWith({
      description: 'DynamoDB event received',
      event: mockEvent,
    });

    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processing record',
      record: mockEvent.Records[0],
    });

    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processing record',
      record: mockEvent.Records[1],
    });

    expect(logger.info).toHaveBeenCalledWith(
      'Finished processing DynamoDB event',
      result,
    );

    // Verify EventPublisher was called for each record
    expect(eventPublisher.sendEvents).toHaveBeenCalledTimes(2);

    // Verify the structure of the published events
    expect(eventPublisher.sendEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        profileversion: '1.0.0',
        profilepublished: '2025-10',
        specversion: '1.0',
        source: 'uk.nhs.notify.digital-letters.ttl-expiry',
        subject: 'temp-subject',
        type: 'uk.nhs.notify.digital.letters.letter.expired.v1',
        datacontenttype: 'application/json',
        dataschema:
          'https://notify.nhs.uk/schemas/events/digital-letters/2025-10/digital-letters.schema.json',
        data: expect.objectContaining({
          'digital-letter-id': expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          ),
          eventID: 'test-event-1',
        }),
      }),
    ]);

    expect(result).toEqual({});
  });

  it('should handle empty records array', async () => {
    const mockEvent: DynamoDBStreamEvent = {
      Records: [],
    };

    const result = await handler(mockEvent);

    expect(logger.info).toHaveBeenCalledWith({
      description: 'DynamoDB event received',
      event: mockEvent,
    });

    expect(logger.info).toHaveBeenCalledWith(
      'Finished processing DynamoDB event',
      result,
    );

    // Verify no events were published for empty records
    expect(eventPublisher.sendEvents).not.toHaveBeenCalled();

    expect(result).toEqual({});
  });

  it('should process single record', async () => {
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
              id: { S: 'test-id-1' },
            },
            OldImage: {
              id: { S: 'test-id-1' },
              ttl: { N: '1234567890' },
              data: { S: 'test-data-1' },
            },
            SequenceNumber: '123456789',
            SizeBytes: 100,
            StreamViewType: 'OLD_IMAGE',
          },
        },
      ] as DynamoDBRecord[],
    };

    const result = await handler(mockEvent);

    expect(logger.info).toHaveBeenCalledWith({
      description: 'Processing record',
      record: mockEvent.Records[0],
    });

    // Verify EventPublisher was called once
    expect(eventPublisher.sendEvents).toHaveBeenCalledTimes(1);

    // Verify the published event contains the record data
    expect(eventPublisher.sendEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        data: expect.objectContaining({
          'digital-letter-id': expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          ),
          eventID: 'test-event-1',
          eventName: 'REMOVE',
          eventVersion: '1.1',
          eventSource: 'aws:dynamodb',
          awsRegion: 'us-east-1',
          dynamodb: expect.objectContaining({
            ApproximateCreationDateTime: 1_234_567_890,
            Keys: {
              id: { S: 'test-id-1' },
            },
            OldImage: {
              id: { S: 'test-id-1' },
              ttl: { N: '1234567890' },
              data: { S: 'test-data-1' },
            },
            SequenceNumber: '123456789',
            SizeBytes: 100,
            StreamViewType: 'OLD_IMAGE',
          }),
        }),
      }),
    ]);

    expect(result).toEqual({});
  });

  it('should handle EventPublisher errors gracefully', async () => {
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
              id: { S: 'test-id-1' },
            },
            SequenceNumber: '123456789',
            SizeBytes: 100,
            StreamViewType: 'KEYS_ONLY',
          },
        },
      ] as DynamoDBRecord[],
    };

    const error = new Error('EventPublisher failed');
    eventPublisher.sendEvents.mockRejectedValueOnce(error);

    await expect(handler(mockEvent)).rejects.toThrow('EventPublisher failed');

    expect(eventPublisher.sendEvents).toHaveBeenCalledTimes(1);
  });
});
