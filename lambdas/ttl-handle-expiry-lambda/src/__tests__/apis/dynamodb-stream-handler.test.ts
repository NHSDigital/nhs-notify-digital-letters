import type { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { Logger } from 'utils';
import { mock } from 'jest-mock-extended';
import { createHandler } from 'apis/dynamodb-stream-handler';

const logger = mock<Logger>();

describe('createHandler', () => {
  const handler = createHandler({
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
            ApproximateCreationDateTime: 1234567890,
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
            ApproximateCreationDateTime: 1234567891,
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
            ApproximateCreationDateTime: 1234567890,
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

    expect(result).toEqual({});
  });
});
