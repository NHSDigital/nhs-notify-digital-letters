import { FileScanner } from 'app/file-scanner';
import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import { ItemDequeued } from 'digital-letters-events';
import itemDequeuedValidator from 'digital-letters-events/ItemDequeued.js';
import { EventPublisher, Logger } from 'utils';

export interface HandlerDependencies {
  eventPublisher: EventPublisher;
  logger: Logger;
  fileScanner: FileScanner;
}

type ValidatedRecord = {
  messageId: string;
  event: ItemDequeued;
};

function validateRecord(
  { body, messageId }: { body: string; messageId: string },
  logger: Logger,
): ValidatedRecord | null {
  try {
    const sqsEventBody = JSON.parse(body);
    const sqsEventDetail = sqsEventBody.detail;

    const isEventValid = itemDequeuedValidator(sqsEventDetail);
    if (!isEventValid) {
      logger.warn({
        err: itemDequeuedValidator.errors,
        description: 'Error parsing queue entry',
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

async function processRecord(
  validatedRecord: ValidatedRecord,
  { fileScanner, logger }: HandlerDependencies,
): Promise<void> {
  const { event } = validatedRecord;

  logger.info({
    description: 'Processing ItemDequeued event',
    eventId: event.id,
    messageReference: event.data.messageReference,
    senderId: event.data.senderId,
  });

  const result = await fileScanner.scanFile(event.data.messageUri, {
    messageReference: event.data.messageReference,
    senderId: event.data.senderId,
    createdAt: event.time,
  });

  if (result.outcome === 'failed') {
    throw new Error(
      `Failed to process file for scanning: ${result.errorMessage}`,
    );
  }
}

export function createHandler(dependencies: HandlerDependencies) {
  return async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
    const { logger } = dependencies;

    logger.info({
      description: 'Starting file scanner batch',
      recordCount: event.Records.length,
    });

    const validatedRecords = event.Records.map((record) =>
      validateRecord(record, logger),
    ).filter((record): record is ValidatedRecord => record !== null);

    const itemFailures: SQSBatchItemFailure[] = [];

    for (const validatedRecord of validatedRecords) {
      try {
        await processRecord(validatedRecord, dependencies);
      } catch (error) {
        logger.error({
          description: 'Error processing record',
          err:
            error instanceof Error
              ? { message: error.message, name: error.name, stack: error.stack }
              : error,
          messageId: validatedRecord.messageId,
        });

        itemFailures.push({ itemIdentifier: validatedRecord.messageId });
      }
    }

    logger.info({
      description: 'Completed file scanner batch',
      successCount: validatedRecords.length - itemFailures.length,
      failureCount: itemFailures.length,
    });

    return { batchItemFailures: itemFailures };
  };
}
