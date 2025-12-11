import type { SQSRecord } from 'aws-lambda';
import { mock } from 'jest-mock-extended';
import { Logger } from 'utils';
import { parseSqsRecord } from 'app/parse-sqs-message';
import { guardDutyNoThreadsFoundEvent } from '__tests__/constants';

describe('parseSqsRecord', () => {
  const mockLogger = mock<Logger>();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses SQS record body and returns GuardDutyScanResultNotificationEvent', () => {
    const sqsRecord: SQSRecord = {
      messageId: 'message-id-1',
      receiptHandle: 'receipt-handle-1',
      body: JSON.stringify({ detail: guardDutyNoThreadsFoundEvent }),
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
    };

    const result = parseSqsRecord(sqsRecord, mockLogger);

    expect(mockLogger.info).toHaveBeenCalledWith({
      description: 'Parsing SQS Record',
      messageId: 'message-id-1',
    });
    expect(mockLogger.debug).toHaveBeenCalledWith({
      description: 'Returning detail as GuardDutyScanResultNotificationEvent',
      detail: guardDutyNoThreadsFoundEvent,
    });
    expect(result).toEqual(guardDutyNoThreadsFoundEvent);
  });
});
