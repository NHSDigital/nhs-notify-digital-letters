import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import { createHash, randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { FileSafe, PDFAnalysed } from 'digital-letters-events';
import fileSafeValidator from 'digital-letters-events/FileSafe.js';
import pdfAnalysedValidator from 'digital-letters-events/PDFAnalysed.js';
import { EventPublisher, Logger, getS3ObjectBufferFromUri } from 'utils';

export interface HandlerDependencies {
  eventPublisher: EventPublisher;
  logger: Logger;
}

type ValidatedRecord = {
  messageId: string;
  event: FileSafe;
};

type PdfInfo = {
  pageCount: number;
  hash: string;
};

function validateRecord(
  { body, messageId }: { body: string; messageId: string },
  logger: Logger,
): ValidatedRecord | null {
  try {
    const sqsEventBody = JSON.parse(body);
    const sqsEventDetail = sqsEventBody.detail;

    const isEventValid = fileSafeValidator(sqsEventDetail);
    if (!isEventValid) {
      logger.warn({
        err: fileSafeValidator.errors,
        description: 'Error parsing print analyser queue entry',
        messageReference:
          sqsEventDetail?.data?.messageReference || 'not present',
      });

      return null;
    }

    return { messageId, event: sqsEventDetail };
  } catch (error) {
    logger.warn({
      err: error,
      description: 'Error parsing SQS record',
    });

    return null;
  }
}

function generateUpdatedEvent(event: FileSafe, pdfInfo: PdfInfo): PDFAnalysed {
  const eventTime = new Date().toISOString();

  const {
    data: { createdAt, letterUri, messageReference, senderId },
  } = event;

  return {
    ...event,
    id: randomUUID(),
    time: eventTime,
    recordedtime: eventTime,
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-print-pdf-analysed-data.schema.json',
    type: 'uk.nhs.notify.digital.letters.print.pdf.analysed.v1',
    // NOTE: CCM-13892 Generate event digital letters source property from scratch
    source:
      '/nhs/england/notify/production/primary/data-plane/digitalletters/print',
    data: {
      senderId,
      messageReference,
      letterUri,
      pageCount: pdfInfo.pageCount,
      sha256Hash: pdfInfo.hash,
      createdAt,
    },
  };
}

async function analysePdf(pdf: Buffer): Promise<PdfInfo> {
  const doc = await PDFDocument.load(pdf);
  const pageCount = doc.getPageCount();

  const hash = createHash('sha256').update(pdf).digest('hex');

  return { pageCount, hash };
}

export const createHandler = ({
  eventPublisher,
  logger,
}: HandlerDependencies) =>
  async function handler(sqsEvent: SQSEvent): Promise<SQSBatchResponse> {
    const receivedItemCount = sqsEvent.Records.length;
    const batchItemFailures: SQSBatchItemFailure[] = [];
    const validatedRecords: ValidatedRecord[] = [];
    const validEvents: PDFAnalysed[] = [];

    logger.info(`Received SQS Event of ${receivedItemCount} record(s)`);

    for (const record of sqsEvent.Records) {
      const validated = validateRecord(record, logger);
      if (validated) {
        validatedRecords.push(validated);
      } else {
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    await Promise.all(
      validatedRecords.map(async (validatedRecord: ValidatedRecord) => {
        try {
          const { event } = validatedRecord;
          const pdfBuffer = await getS3ObjectBufferFromUri(
            event.data.letterUri,
          );
          const pdfInfo = await analysePdf(pdfBuffer);
          validEvents.push(generateUpdatedEvent(event, pdfInfo));
        } catch (error: any) {
          logger.warn({
            err: error.message,
            description: 'Failed processing message',
          });
          batchItemFailures.push({ itemIdentifier: validatedRecord.messageId });
        }
      }),
    );

    await eventPublisher.sendEvents(validEvents, pdfAnalysedValidator);

    const processedItemCount = receivedItemCount - batchItemFailures.length;
    logger.info(
      `${processedItemCount} of ${receivedItemCount} records processed successfully`,
    );

    return { batchItemFailures };
  };
