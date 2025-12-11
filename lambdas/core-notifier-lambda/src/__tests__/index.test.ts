import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { handler } from 'index';
import { createContainer } from 'container';
import { createHandler as createSqsHandler } from 'apis/sqs-handler';
import type { SqsHandlerDependencies } from 'apis/sqs-handler';
import { mock } from 'jest-mock-extended';

jest.mock('container');
jest.mock('apis/sqs-handler');

const createSqsEvent = (recordCount: number): SQSEvent => ({
  Records: Array.from(
    { length: recordCount },
    (_, i): SQSRecord => ({
      messageId: `message-id-${i + 1}`,
      receiptHandle: `receipt-handle-${i + 1}`,
      body: JSON.stringify({
        detail: {
          id: `event-id-${i + 1}`,
          source: 'test',
          specversion: '1.0',
          type: 'test.event',
          time: '2025-12-16T10:00:00Z',
          datacontenttype: 'application/json',
          data: {},
        },
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
    }),
  ),
});

describe('Lambda handler', () => {
  const mockContainer = mock<SqsHandlerDependencies>();
  const mockSqsHandler = jest.fn();
  const mockCreateContainer = jest.mocked(createContainer);
  const mockCreateSqsHandler = jest.mocked(createSqsHandler);

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateContainer.mockResolvedValue(mockContainer);
    mockCreateSqsHandler.mockReturnValue(mockSqsHandler);
    mockSqsHandler.mockResolvedValue({ batchItemFailures: [] });
  });

  it('creates an SQS handler with the container dependencies and handler being invoked', async () => {
    const sqsEvent = createSqsEvent(1);

    await handler(sqsEvent);

    expect(mockCreateSqsHandler).toHaveBeenCalledTimes(1);
    expect(mockCreateSqsHandler).toHaveBeenCalledWith(mockContainer);
    expect(mockSqsHandler).toHaveBeenCalledTimes(1);
    expect(mockSqsHandler).toHaveBeenCalledWith(sqsEvent);
  });

  it('when fails to process a message it returns the id of the failed message', async () => {
    const sqsEvent = createSqsEvent(1);
    const expectedResult = {
      batchItemFailures: [{ itemIdentifier: 'message-id-1' }],
    };
    mockSqsHandler.mockResolvedValue(expectedResult);

    const result = await handler(sqsEvent);

    expect(result).toEqual(expectedResult);
  });

  it('handles multiple records in the event', async () => {
    const sqsEvent = createSqsEvent(5);

    await handler(sqsEvent);

    expect(mockSqsHandler).toHaveBeenCalledWith(sqsEvent);
    expect(sqsEvent.Records).toHaveLength(5);
  });

  it('propagates errors from createContainer', async () => {
    const sqsEvent = createSqsEvent(1);
    const error = new Error('Failed to create container');
    mockCreateContainer.mockRejectedValue(error);

    await expect(handler(sqsEvent)).rejects.toThrow(
      'Failed to create container',
    );
  });

  it('propagates errors from the SQS handler', async () => {
    const sqsEvent = createSqsEvent(1);
    const error = new Error('Handler failed');
    mockSqsHandler.mockRejectedValue(error);

    await expect(handler(sqsEvent)).rejects.toThrow('Handler failed');
  });
});
