import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { DynamoDBRecord } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { Dlq, DlqDependencies } from 'app/dlq';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}));

const mockRandomUUID = randomUUID as jest.MockedFunction<typeof randomUUID>;

describe('Dlq', () => {
  let mockSqsClient: any;
  let mockLogger: any;
  let dlqConfig: DlqDependencies;

  const mockRecord: DynamoDBRecord = {
    eventID: 'test-event-id',
    eventName: 'REMOVE',
    eventVersion: '1.1',
    eventSource: 'aws:dynamodb',
    awsRegion: 'us-east-1',
    dynamodb: {
      Keys: {
        id: { S: 'test-id' },
      },
      OldImage: {
        id: { S: 'test-id' },
        expiresAt: { N: '1640995200' },
      },
      StreamViewType: 'OLD_IMAGE',
    },
    eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/test-table',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSqsClient = {
      send: jest.fn(),
    };

    mockLogger = {
      warn: jest.fn(),
    };

    dlqConfig = {
      dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq',
      logger: mockLogger,
      sqsClient: mockSqsClient,
    };

    mockRandomUUID.mockReturnValue('550e8400-e29b-41d4-a716-446655440000');
  });

  describe('constructor', () => {
    it('should create a Dlq instance with valid configuration', () => {
      const dlq = new Dlq(dlqConfig);
      expect(dlq).toBeInstanceOf(Dlq);
    });

    it('should throw error if dlqUrl is not provided', () => {
      expect(() => {
        return new Dlq({ ...dlqConfig, dlqUrl: '' });
      }).toThrow('dlqUrl has not been specified');
    });

    it('should throw error if logger is not provided', () => {
      expect(() => {
        return new Dlq({ ...dlqConfig, logger: undefined as any });
      }).toThrow('logger has not been provided');
    });

    it('should throw error if sqsClient is not provided', () => {
      expect(() => {
        return new Dlq({ ...dlqConfig, sqsClient: undefined as any });
      }).toThrow('sqsClient has not been provided');
    });
  });

  describe('send', () => {
    let dlq: Dlq;

    beforeEach(() => {
      dlq = new Dlq(dlqConfig);
    });

    it('should send records to DLQ successfully', async () => {
      const successfulResponse = {
        Failed: undefined,
      };

      mockSqsClient.send.mockResolvedValue(successfulResponse);

      const result = await dlq.send([mockRecord]);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        description: 'Sending failed records to DLQ',
        dlqUrl: dlqConfig.dlqUrl,
        eventCount: 1,
      });

      expect(mockSqsClient.send).toHaveBeenCalledWith(
        expect.any(SendMessageBatchCommand),
      );

      const sendCall = mockSqsClient.send.mock.calls[0][0];
      expect(sendCall.input.QueueUrl).toBe(dlqConfig.dlqUrl);
      expect(sendCall.input.Entries).toHaveLength(1);
      expect(sendCall.input.Entries[0].Id).toBe(
        '550e8400-e29b-41d4-a716-446655440000',
      );
      expect(sendCall.input.Entries[0].MessageBody).toBe(
        JSON.stringify(mockRecord),
      );

      expect(result).toEqual([]);
    });

    it('should handle partial failures from SQS batch send', async () => {
      const partialFailureResponse = {
        Failed: [
          {
            Id: '550e8400-e29b-41d4-a716-446655440000',
            Code: 'InternalError',
            Message: 'Test error',
          },
        ],
      };

      mockSqsClient.send.mockResolvedValue(partialFailureResponse);

      const result = await dlq.send([mockRecord]);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        description: 'Sending failed records to DLQ',
        dlqUrl: dlqConfig.dlqUrl,
        eventCount: 1,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith({
        description: 'Record failed to send to DLQ',
        errorCode: 'InternalError',
        errorMessage: 'Test error',
        eventId: 'test-event-id',
      });

      expect(result).toEqual([mockRecord]);
    });

    it('should handle SQS send errors', async () => {
      const error = new Error('SQS send failed');
      mockSqsClient.send.mockRejectedValue(error);

      const result = await dlq.send([mockRecord]);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        description: 'DLQ send error',
        err: error,
        dlqUrl: dlqConfig.dlqUrl,
        batchSize: 1,
      });

      expect(result).toEqual([mockRecord]);
    });

    it('should batch records when more than MAX_BATCH_SIZE', async () => {
      const records: DynamoDBRecord[] = [];
      const expectedUuids: string[] = [];

      // Create 15 records to test batching (MAX_BATCH_SIZE is 10)
      for (let i = 0; i < 15; i++) {
        const uuid = `550e8400-e29b-41d4-a716-44665544000${i.toString().padStart(1, '0')}`;
        expectedUuids.push(uuid);
        records.push({
          ...mockRecord,
          eventID: `event-id-${i}`,
        });
      }

      let uuidIndex = 0;
      mockRandomUUID.mockImplementation(() => {
        const uuid = expectedUuids[uuidIndex];
        uuidIndex += 1;
        return uuid as any;
      });

      const successfulResponse = { Failed: undefined };
      mockSqsClient.send.mockResolvedValue(successfulResponse);

      const result = await dlq.send(records);

      expect(mockSqsClient.send).toHaveBeenCalledTimes(2); // 15 records = 2 batches
      expect(result).toEqual([]);
    });

    it('should handle failed entries with missing ID', async () => {
      const partialFailureResponse = {
        Failed: [
          {
            Id: undefined, // Missing ID
            Code: 'InternalError',
            Message: 'Test error',
          },
        ],
      };

      mockSqsClient.send.mockResolvedValue(partialFailureResponse);

      const result = await dlq.send([mockRecord]);

      // Should not add to failed results if ID is missing
      expect(result).toEqual([]);
    });

    it('should handle failed entries with non-matching ID', async () => {
      const partialFailureResponse = {
        Failed: [
          {
            Id: '550e8400-e29b-41d4-a716-446655440099', // Non-matching UUID
            Code: 'InternalError',
            Message: 'Test error',
          },
        ],
      };

      mockSqsClient.send.mockResolvedValue(partialFailureResponse);

      const result = await dlq.send([mockRecord]);

      // Should not add to failed results if ID doesn't match any record
      expect(result).toEqual([]);
    });
  });
});
