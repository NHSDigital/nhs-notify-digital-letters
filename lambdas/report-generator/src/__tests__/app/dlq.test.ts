import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { randomUUID } from 'node:crypto';
import { Dlq, DlqDependencies } from 'app/dlq';
import { GenerateReport } from 'digital-letters-events';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}));

const mockRandomUUID = randomUUID as jest.MockedFunction<typeof randomUUID>;

describe('Dlq', () => {
  let mockSqsClient: any;
  let mockLogger: any;
  let dlqConfig: DlqDependencies;

  const mockRecord: GenerateReport = {
    id: 'test-event-id',
    specversion: '1.0',
    source:
      '/nhs/england/notify/production/primary/data-plane/digitalletters/reporting',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    type: 'uk.nhs.notify.digital.letters.reporting.generate.report.v1',
    time: new Date().toISOString(),
    recordedtime: new Date().toISOString(),
    severitynumber: 2,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-reporting-generate-report-data.schema.json',
    severitytext: 'INFO',
    data: {
      senderId: 'sender1',
      reportDate: '2024-01-01',
    },
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
