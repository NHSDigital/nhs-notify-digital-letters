import { createHandler } from 'apis/sqs-handler';
import { Logger } from 'utils';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { mock } from 'jest-mock-extended';

const logger = mock<Logger>();

const event = {
  sourceEventId: 'test-event-id',
};

const sqsRecord1: SQSRecord = {
  messageId: '1',
  receiptHandle: 'abc',
  body: JSON.stringify(event),
  attributes: {
    ApproximateReceiveCount: '1',
    SentTimestamp: '2025-07-03T14:23:30Z',
    SenderId: 'sender-id',
    ApproximateFirstReceiveTimestamp: '2025-07-03T14:23:30Z',
  },
  messageAttributes: {},
  md5OfBody: '',
  eventSource: 'aws:sqs',
  eventSourceARN: '',
  awsRegion: '',
};

const singleRecordEvent: SQSEvent = {
  Records: [sqsRecord1],
};

const handler = createHandler({
  logger,
});

describe('SQS Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes a single record', async () => {
    const response = await handler(singleRecordEvent);

    expect(logger.info).toHaveBeenCalledWith(
      'Received SQS Event of 1 record(s)',
    );
    expect(logger.info).toHaveBeenCalledWith(
      '1 of 1 records processed successfully',
    );
    expect(response).toEqual({ batchItemFailures: [] });
  });

  it('should return failed items to the queue if an error occurs while processing them', async () => {
    singleRecordEvent.Records[0].body = 'not-json';

    const result = await handler(singleRecordEvent);

    expect(logger.warn).toHaveBeenCalledWith({
      error: `Unexpected token 'o', "not-json" is not valid JSON`,
      description: 'Failed processing message',
      messageId: '1',
    });

    expect(logger.info).toHaveBeenCalledWith(
      '0 of 1 records processed successfully',
    );

    expect(result).toEqual({
      batchItemFailures: [{ itemIdentifier: '1' }],
    });
  });
});
