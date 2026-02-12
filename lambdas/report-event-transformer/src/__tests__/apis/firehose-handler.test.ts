import { mock } from 'jest-mock-extended';
import { createHandler } from 'apis/firehose-handler';
import { Logger } from 'utils';
import { digitalLettersEvent, firehoseEvent } from '__tests__/test-data';

const logger = mock<Logger>();

const handler = createHandler({
  logger,
});

describe('Firehose Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('status', () => {
    it('should process valid digital letters event and return report event', async () => {
      const response = await handler(firehoseEvent([digitalLettersEvent]));

      expect(logger.info).toHaveBeenCalledWith(
        'Received Firehose Event of 1 record(s)',
      );

      expect(logger.info).toHaveBeenCalledWith(
        '1 of 1 records processed successfully',
      );

      expect(response.records).toHaveLength(1);
      expect(response.records[0]).toMatchObject({
        recordId: '1',
        result: 'Ok',
        metadata: {
          partitionKeys: {
            year: '2023',
            month: '6',
            day: '20',
            senderId: 'sender1',
          },
        },
      });

      // Verify the data is base64 encoded JSON
      const decodedData = JSON.parse(
        Buffer.from(response.records[0].data!, 'base64').toString('utf8'),
      );
      expect(decodedData).toEqual({
        messageReference: digitalLettersEvent.data.messageReference,
        pageCount: digitalLettersEvent.data.pageCount,
        reasonCode: digitalLettersEvent.data.reasonCode,
        reasonText: digitalLettersEvent.data.reasonText,
        senderId: digitalLettersEvent.data.senderId,
        supplierId: digitalLettersEvent.data.supplierId,
        time: digitalLettersEvent.time,
        type: digitalLettersEvent.type,
      });
    });
  });

  describe('errors', () => {
    it('should return ProcessingFailed for records with invalid JSON', async () => {
      const event = firehoseEvent([digitalLettersEvent]);
      event.records[0].data = Buffer.from('not-json').toString('base64');

      const result = await handler(event);

      expect(logger.warn).toHaveBeenCalledWith({
        err: expect.any(SyntaxError),
        description: 'Error parsing firehose record',
      });

      expect(logger.info).toHaveBeenCalledWith(
        '0 of 1 records processed successfully',
      );

      expect(result.records).toHaveLength(1);
      expect(result.records[0]).toMatchObject({
        recordId: '1',
        result: 'ProcessingFailed',
      });
    });

    it('should return ProcessingFailed for records with invalid event schema', async () => {
      const invalidEvent = {
        ...digitalLettersEvent,
        type: 123, // Invalid: should be string
      };
      const event = firehoseEvent([invalidEvent as any]);

      const result = await handler(event);

      expect(logger.warn).toHaveBeenCalledWith({
        err: expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ['type'],
            }),
          ]),
        }),
        description: 'Error parsing firehose item',
      });

      expect(logger.info).toHaveBeenCalledWith(
        '0 of 1 records processed successfully',
      );

      expect(result.records).toHaveLength(1);
      expect(result.records[0]).toMatchObject({
        recordId: '1',
        result: 'ProcessingFailed',
      });
    });
  });
});
