import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import {
  $LetterEvent,
  LetterEvent,
} from '@nhsdigital/nhs-notify-event-schemas-supplier-api/src/events/letter-events';
import {
  PrintLetterTransitioned,
  PrintLetterTransitionedData,
} from 'digital-letters-events';
import printLetterTransitionedValidator from 'digital-letters-events/PrintLetterTransitioned.js';
import { EventPublisher, Logger } from 'utils';

export interface HandlerDependencies {
  eventPublisher: EventPublisher;
  logger: Logger;
}

type ValidatedRecord = {
  messageId: string;
  event: LetterEvent;
};

function validateRecord(
  { body, messageId }: { body: string; messageId: string },
  logger: Logger,
): ValidatedRecord | null {
  try {
    const sqsEventBody = JSON.parse(body);
    const sqsEventDetail = sqsEventBody.detail;

    const {
      data: item,
      error: parseError,
      success: parseSuccess,
    } = $LetterEvent.safeParse(sqsEventDetail);

    if (!parseSuccess) {
      logger.warn({
        err: parseError,
        description: 'Error parsing queue item',
      });

      return null;
    }

    return { messageId, event: item };
  } catch (error) {
    logger.warn({
      err: error,
      description: 'Error parsing SQS record',
    });

    return null;
  }
}

function generateUpdatedEvent(event: LetterEvent): PrintLetterTransitioned {
  const eventTime = new Date().toISOString();

  const {
    data: {
      origin: { subject },
      specificationId,
      status,
      supplierId,
    },
    time,
  } = event;

  const senderId = subject.split('/')[1];
  const messageReference = subject.split('/')[3];

  return {
    ...event,
    id: randomUUID(),
    time: eventTime,
    recordedtime: eventTime,
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-print-letter-transitioned-data.schema.json',
    type: 'uk.nhs.notify.digital.letters.print.letter.transitioned.v1',
    data: {
      senderId,
      messageReference,
      specificationId,
      status: status as PrintLetterTransitionedData['status'],
      supplierId,
      time,
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
    const validEvents: PrintLetterTransitioned[] = [];

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

    eventPublisher.sendEvents(validEvents, printLetterTransitionedValidator);

    const processedItemCount = receivedItemCount - batchItemFailures.length;
    logger.info(
      `${processedItemCount} of ${receivedItemCount} records processed successfully`,
    );

    return { batchItemFailures };
  };
