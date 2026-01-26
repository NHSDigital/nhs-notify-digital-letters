import { mock } from 'jest-mock-extended';
import { createHandler } from 'apis/sqs-handler';
import { Logger } from 'utils';
import { digitalLettersEvent, recordEvent } from '__tests__/test-data';

const logger = mock<Logger>();

const handler = createHandler({
  athenaArn: 'some value',
  logger,
});

describe('SQS Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('status', () => {
    it('should process valid digital letters event and log report event', async () => {
      const response = await handler(recordEvent([digitalLettersEvent]));

      expect(logger.info).toHaveBeenCalledWith(
        'Received SQS Event of 1 record(s)',
      );

      expect(logger.info).toHaveBeenCalledWith({
        description: 'Following report events will be sent to some value',
        validEvents: [
          {
            messageReference: digitalLettersEvent.data.messageReference,
            senderId: digitalLettersEvent.data.senderId,
            pageCount: digitalLettersEvent.data.pageCount,
            supplierId: digitalLettersEvent.data.supplierId,
            time: digitalLettersEvent.time,
            type: digitalLettersEvent.type,
          },
        ],
      });

      expect(logger.info).toHaveBeenCalledWith(
        '1 of 1 records processed successfully',
      );

      expect(response).toEqual({ batchItemFailures: [] });
    });
  });

  describe('errors', () => {
    it('should return failed SQS records to the queue if an error occurs while parsing them', async () => {
      const event = recordEvent([digitalLettersEvent]);
      event.Records[0].body = 'not-json';

      const result = await handler(event);

      expect(logger.warn).toHaveBeenCalledWith({
        err: new SyntaxError(
          `Unexpected token 'o', "not-json" is not valid JSON`,
        ),
        description: 'Error parsing SQS record',
      });

      expect(logger.info).toHaveBeenCalledWith(
        '0 of 1 records processed successfully',
      );

      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: '1' }],
      });
    });

    it('should return failed items to the queue if an invalid event is received', async () => {
      const invalidEvent = {
        ...digitalLettersEvent,
        type: 123, // Invalid: should be string
      };
      const event = recordEvent([invalidEvent as any]);

      const result = await handler(event);

      expect(logger.warn).toHaveBeenCalledWith({
        err: expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ['type'],
            }),
          ]),
        }),
        description: 'Error parsing queue item',
      });

      expect(logger.info).toHaveBeenCalledWith(
        '0 of 1 records processed successfully',
      );

      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: '1' }],
      });
    });
  });
});
