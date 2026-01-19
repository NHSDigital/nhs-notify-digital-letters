import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { FileSafe, PDFAnalysed } from 'digital-letters-events';
import fileSafeValidator from 'digital-letters-events/FileSafe.js';
import pdfAnalysedValidator from 'digital-letters-events/PDFAnalysed.js';
import { EventPublisher, Logger } from 'utils';

export interface HandlerDependencies {
  eventPublisher: EventPublisher;
  logger: Logger;
}

type ValidatedRecord = {
  messageId: string;
  event: FileSafe;
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

function generateUpdatedEvent(event: FileSafe): PDFAnalysed {
  const eventTime = new Date().toISOString();

  const {
    data: { letterUri, messageReference, senderId },
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
      pageCount: 1,
      sha256Hash: 'sha-value',
      createdAt: eventTime,
    },
  };
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
          validEvents.push(generateUpdatedEvent(event));
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
