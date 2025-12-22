import { Pdm } from 'app/pdm';
import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import {
  PDMResourceSubmitted,
  PDMResourceUnavailable,
} from 'digital-letters-events';
import pdmResourceAvailableValidator from 'digital-letters-events/PDMResourceAvailable.js';
import pdmResourceSubmittedValidator from 'digital-letters-events/PDMResourceSubmitted.js';
import pdmResourceUnavailableValidator from 'digital-letters-events/PDMResourceUnavailable.js';
import { randomUUID } from 'node:crypto';
import { EventPublisher, Logger } from 'utils';

export interface HandlerDependencies {
  eventPublisher: EventPublisher;
  logger: Logger;
  pdm: Pdm;
  pollMaxRetries: number;
}

interface ValidatedRecord {
  messageId: string;
  event: PDMResourceSubmitted | PDMResourceUnavailable;
}

function validateRecord(
  { body, messageId }: { body: string; messageId: string },
  logger: Logger,
): ValidatedRecord | null {
  try {
    const sqsEventBody = JSON.parse(body);
    const sqsEventDetail = sqsEventBody.detail;

    if (
      sqsEventDetail.type ===
      'uk.nhs.notify.digital.letters.pdm.resource.submitted.v1'
    ) {
      const isEventValid = pdmResourceSubmittedValidator(sqsEventDetail);
      if (!isEventValid) {
        logger.warn({
          err: pdmResourceSubmittedValidator.errors,
          description: 'Error parsing queue entry',
        });

        return null;
      }

      return { messageId, event: sqsEventDetail };
    }

    const isEventValid = pdmResourceUnavailableValidator(sqsEventDetail);
    if (!isEventValid) {
      logger.warn({
        err: pdmResourceUnavailableValidator.errors,
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

export const createHandler = ({
  eventPublisher,
  logger,
  pdm,
  pollMaxRetries,
}: HandlerDependencies) =>
  async function handler(sqsEvent: SQSEvent): Promise<SQSBatchResponse> {
    const receivedItemCount = sqsEvent.Records.length;

    logger.info(`Received SQS Event of ${receivedItemCount} record(s)`);

    const batchItemFailures: SQSBatchItemFailure[] = [];

    const validatedRecords: ValidatedRecord[] = [];
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
          const result = await pdm.poll(event);
          const retries =
            ('retryCount' in event.data ? event.data.retryCount : -1) + 1;
          const eventTime = new Date().toISOString();

          if (result === 'unavailable') {
            const eventType =
              retries >= pollMaxRetries
                ? 'uk.nhs.notify.digital.letters.pdm.resource.retries.exceeded.v1'
                : 'uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1';

            await eventPublisher.sendEvents(
              [
                {
                  ...event,
                  id: randomUUID(),
                  time: eventTime,
                  recordedtime: eventTime,
                  dataschema:
                    'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-unavailable-data.schema.json',
                  type: eventType,
                  data: {
                    ...event.data,
                    retryCount: retries,
                  },
                },
              ],
              pdmResourceUnavailableValidator,
            );
          } else {
            await eventPublisher.sendEvents(
              [
                {
                  ...event,
                  id: randomUUID(),
                  time: eventTime,
                  recordedtime: eventTime,
                  dataschema:
                    'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-available-data.schema.json',
                  type: 'uk.nhs.notify.digital.letters.pdm.resource.available.v1',
                  data: {
                    ...event.data,
                    nhsNumber: '9999999999',
                    odsCode: 'AB1234',
                  },
                },
              ],
              pdmResourceAvailableValidator,
            );
          }
        } catch (error: any) {
          logger.warn({
            err: error.message,
            description: 'Failed processing message',
          });
          batchItemFailures.push({ itemIdentifier: validatedRecord.messageId });
        }
      }),
    );

    const processedItemCount = receivedItemCount - batchItemFailures.length;
    logger.info(
      `${processedItemCount} of ${receivedItemCount} records processed successfully`,
    );

    return { batchItemFailures };
  };
