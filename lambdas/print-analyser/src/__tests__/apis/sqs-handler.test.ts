import { mock } from 'jest-mock-extended';
import { randomUUID } from 'node:crypto';
import { createHandler } from 'apis/sqs-handler';
import { EventPublisher, Logger } from 'utils';
import { fileSafeEvent, fivePagePdf, recordEvent } from '__tests__/test-data';

const logger = mock<Logger>();
const eventPublisher = mock<EventPublisher>();

jest.mock('node:crypto', () => ({
  ...jest.requireActual('node:crypto'),
  randomUUID: jest.fn(),
}));

const mockGetS3ObjectBufferFromUri = jest.fn();
jest.mock('utils', () => ({
  ...jest.requireActual('utils'),
  getS3ObjectBufferFromUri: (...args: any[]) =>
    mockGetS3ObjectBufferFromUri(...args),
}));

const mockRandomUUID = randomUUID as jest.MockedFunction<typeof randomUUID>;
const mockDate = jest.spyOn(Date.prototype, 'toISOString');
mockRandomUUID.mockReturnValue('550e8400-e29b-41d4-a716-446655440001');
mockDate.mockReturnValue('2023-06-20T12:00:00.250Z');

const handler = createHandler({
  eventPublisher,
  logger,
});

describe('SQS Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('file safe', () => {
    it('should send pdf.analysed event when file.safe received', async () => {
      const testPdf = fivePagePdf();
      mockGetS3ObjectBufferFromUri.mockResolvedValue(testPdf);

      const response = await handler(recordEvent([fileSafeEvent]));

      expect(mockGetS3ObjectBufferFromUri).toHaveBeenCalledWith(
        fileSafeEvent.data.letterUri,
      );
      expect(eventPublisher.sendEvents).toHaveBeenCalledWith(
        [
          {
            ...fileSafeEvent,
            id: '550e8400-e29b-41d4-a716-446655440001',
            time: '2023-06-20T12:00:00.250Z',
            recordedtime: '2023-06-20T12:00:00.250Z',
            dataschema:
              'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-print-pdf-analysed-data.schema.json',
            type: 'uk.nhs.notify.digital.letters.print.pdf.analysed.v1',
            source:
              '/nhs/england/notify/production/primary/data-plane/digitalletters/print',
            data: {
              senderId: fileSafeEvent.data.senderId,
              messageReference: fileSafeEvent.data.messageReference,
              letterUri: fileSafeEvent.data.letterUri,
              pageCount: 5,
              sha256Hash:
                '631b6ef1a936e62277d55a80deb850babdde861152d476489d75b0c9161bd326',
              createdAt: fileSafeEvent.data.createdAt,
            },
          },
        ],
        expect.any(Function),
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Received SQS Event of 1 record(s)',
      );
      expect(logger.info).toHaveBeenCalledWith(
        '1 of 1 records processed successfully',
      );
      expect(response).toEqual({ batchItemFailures: [] });
    });
  });

  describe('errors', () => {
    it('should return failed SQS records to the queue if an error occurs while processing them', async () => {
      const event = recordEvent([fileSafeEvent]);
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

    it('should return failed items to the queue if an invalid file.safe event is received', async () => {
      const invalidFileSafeEvent = {
        ...fileSafeEvent,
        source: 'invalid file.safe source',
      };
      const event = recordEvent([invalidFileSafeEvent]);

      const result = await handler(event);

      expect(logger.warn).toHaveBeenCalledWith({
        err: expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/source',
          }),
        ]),
        description: 'Error parsing print analyser queue entry',
      });

      expect(logger.info).toHaveBeenCalledWith(
        '0 of 1 records processed successfully',
      );

      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: '1' }],
      });
    });

    it('should return failed items to the queue if event transformation fails', async () => {
      const testPdf = fivePagePdf();
      mockGetS3ObjectBufferFromUri.mockResolvedValue(testPdf);

      mockRandomUUID.mockImplementationOnce(() => {
        throw new Error('A forced error scenario');
      });

      const event = recordEvent([fileSafeEvent]);
      const result = await handler(event);

      expect(logger.warn).toHaveBeenCalledWith({
        err: 'A forced error scenario',
        description: 'Failed processing message',
      });

      expect(logger.info).toHaveBeenCalledWith(
        '0 of 1 records processed successfully',
      );

      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: '1' }],
      });
    });

    it('should return failed items to the queue if PDF analysis fails', async () => {
      mockGetS3ObjectBufferFromUri.mockRejectedValue(
        new Error('S3 GetObject failed'),
      );

      const event = recordEvent([fileSafeEvent]);

      const result = await handler(event);

      expect(logger.warn).toHaveBeenCalledWith({
        err: 'S3 GetObject failed',
        description: 'Failed processing message',
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
