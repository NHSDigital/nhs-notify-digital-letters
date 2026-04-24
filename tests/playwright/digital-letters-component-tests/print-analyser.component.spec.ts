import { expect, test } from '@playwright/test';
import {
  FILE_SAFE_S3_BUCKET_NAME,
  PRINT_ANALYSER_DLQ_NAME,
} from 'constants/backend-constants';
import eventPublisher from 'helpers/event-bus-helpers';
import { fivePagePdf } from 'helpers/pdf-helpers';
import { v4 as uuidv4 } from 'uuid';
import { FileSafe, validateFileSafe } from 'digital-letters-events';
import { expectMessageContainingString, purgeQueue } from 'helpers/sqs-helpers';
import {
  PRINT_OBSERVER_QUEUE_URL,
  expectEventOnTestObserverQueue,
} from 'helpers/test-observer-helpers';
import { putFileS3 } from 'utils';

export const fileSafeEvent: FileSafe = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  specversion: '1.0',
  plane: 'data',
  dataschemaversion: '1.0.0',
  source: '/nhs/england/notify/production/primary/digitalletters/print',
  subject:
    'letter-origin/digital-letters/letter/f47ac10b-58cc-4372-a567-0e02b2c3d479',
  type: 'uk.nhs.notify.digital.letters.print.file.safe.v1',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-print-file-safe-data.schema.json',
  time: '2023-06-20T12:00:00Z',
  recordedtime: '2023-06-20T12:00:00.250Z',
  severitynumber: 2,
  traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
  datacontenttype: 'application/json',
  severitytext: 'INFO',
  data: {
    messageReference: 'ref1',
    senderId: 'sender1',
    letterUri: 'uri1',
    createdAt: '2023-06-20T12:00:00.250Z',
  },
};

test.describe('Print analyser', () => {
  const pdfFilename = `${uuidv4()}.pdf`;

  test.beforeAll(async () => {
    test.setTimeout(150_000);

    await purgeQueue(PRINT_ANALYSER_DLQ_NAME);

    await putFileS3(fivePagePdf(), {
      Bucket: FILE_SAFE_S3_BUCKET_NAME,
      Key: pdfFilename,
    });
  });

  test(`should create pdf.analysed event for a file.safe event`, async () => {
    const messageReference = uuidv4();
    const event: FileSafe = {
      ...fileSafeEvent,
      data: {
        ...fileSafeEvent.data,
        letterUri: `s3://${FILE_SAFE_S3_BUCKET_NAME}/${pdfFilename}`,
        messageReference,
      },
    };

    await eventPublisher.sendEvents<FileSafe>([event], validateFileSafe);

    const analysedDetail = await expectEventOnTestObserverQueue(
      PRINT_OBSERVER_QUEUE_URL,
      'uk.nhs.notify.digital.letters.print.pdf.analysed.v1',
      (d) => {
        const { data } = d as any;
        return (
          data.messageReference === messageReference &&
          data.senderId === event.data.senderId
        );
      },
      80_000,
    );
    const analysedData = (analysedDetail as any).data;
    expect(analysedData.letterUri).toBe(event.data.letterUri);
    expect(analysedData.pageCount).toBe(5);
    expect(analysedData.sha256Hash).toBe(
      '631b6ef1a936e62277d55a80deb850babdde861152d476489d75b0c9161bd326',
    );
    expect(analysedData.createdAt).toBe(event.data.createdAt);
  });

  test('should send invalid event to print analyser dlq', async () => {
    test.setTimeout(160_000);

    // Send file.safe event with missing data properties
    const messageReference = uuidv4();
    const event = {
      ...fileSafeEvent,
      data: {
        messageReference,
      },
    } as FileSafe;

    await eventPublisher.sendEvents<FileSafe>([event], () => true);

    await expectMessageContainingString(
      PRINT_ANALYSER_DLQ_NAME,
      messageReference,
      150,
    );
  });
});
