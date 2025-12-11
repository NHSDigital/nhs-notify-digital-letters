import { SQSRecord } from 'aws-lambda';
import { mock } from 'jest-mock-extended';
import { Logger } from 'utils';
import { parseSqsRecord } from 'app/parse-sqs-message';
import { InvalidPdmResourceAvailableEvent } from 'domain/invalid-pdm-resource-available-event';
import { validPdmEvent } from '__tests__/constants';

// Import the mocked validator after the mock setup
import { messageDownloadedValidator } from 'digital-letters-events/PDMResourceAvailable.js';

jest.mock('digital-letters-events/PDMResourceAvailable.js', () => ({
  messageDownloadedValidator: jest.fn(),
}));

const mockLogger = mock<Logger>();

describe('parseSqsRecord', () => {
  const messageId = 'test-message-id-123';

  const createSqsRecord = (detail: any): SQSRecord => ({
    messageId,
    receiptHandle: 'receipt-handle',
    body: JSON.stringify({
      detail,
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when SQS record contains a valid PDMResourceAvailable event', () => {
    it('parses and returns the PDMResourceAvailable event', () => {
      const sqsRecord = createSqsRecord(validPdmEvent);
      (messageDownloadedValidator as jest.Mock).mockReturnValueOnce(true);

      const result = parseSqsRecord(sqsRecord, mockLogger);

      expect(result).toEqual(validPdmEvent);
      expect(mockLogger.info).toHaveBeenCalledWith('Parsing SQS Record', {
        messageId,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Parsed valid PDMResourceAvailable Event',
        {
          messageId,
        },
      );
      expect(messageDownloadedValidator).toHaveBeenCalledWith(validPdmEvent);
    });
  });

  describe('when SQS record contains an invalid PDMResourceAvailable event', () => {
    it('logs error and throws InvalidPdmResourceAvailableEvent', () => {
      const invalidEvent = { ...validPdmEvent, data: {} };
      const sqsRecord = createSqsRecord(invalidEvent);
      const validationErrors = [
        {
          instancePath: '/data',
          schemaPath: '#/properties/data/required',
          keyword: 'required',
          params: { missingProperty: 'senderId' },
          message: "must have required property 'senderId'",
        },
      ];
      (messageDownloadedValidator as jest.Mock).mockReturnValueOnce(false);
      messageDownloadedValidator.errors = validationErrors;

      expect(() => parseSqsRecord(sqsRecord, mockLogger)).toThrow(
        InvalidPdmResourceAvailableEvent,
      );

      expect(mockLogger.error).toHaveBeenCalledWith({
        err: validationErrors,
        description:
          'The SQS message does not contain a valid PDMResourceAvailable event',
        messageId,
      });
    });
  });

  describe('when SQS record body is malformed JSON', () => {
    it('throws a JSON parse error', () => {
      const sqsRecord: SQSRecord = {
        messageId,
        receiptHandle: 'receipt-handle',
        body: 'not valid json{',
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

      expect(() => parseSqsRecord(sqsRecord, mockLogger)).toThrow(SyntaxError);
      expect(mockLogger.info).toHaveBeenCalledWith('Parsing SQS Record', {
        messageId,
      });
    });
  });
});
