import { Pdm } from 'app/pdm';
import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { EventPublisher, Logger } from 'utils';

export interface HandlerDependencies {
  eventPublisher: EventPublisher;
  logger: Logger;
  pdm: Pdm;
  pollMaxRetries: number;
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

    await Promise.all(
      sqsEvent.Records.map(async (sqsRecord: SQSRecord) => {
        try {
          const event = JSON.parse(sqsRecord.body); // Note: Add event validation when that ticket is completed.
          const eventDetail = event.detail;

          const result = await pdm.poll(eventDetail);

          const retries = (eventDetail.data?.retryCount ?? -1) + 1;
          const eventTime = new Date().toISOString();
          let eventType =
            'uk.nhs.notify.digital.letters.pdm.resource.available.v1';

          if (result === 'unavailable') {
            eventType =
              retries >= pollMaxRetries
                ? 'uk.nhs.notify.digital.letters.pdm.resource.retries.exceeded.v1'
                : 'uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1';
          }

          await eventPublisher.sendEvents([
            {
              ...eventDetail,
              id: randomUUID(),
              time: eventTime,
              recordedtime: eventTime,
              type: eventType,
              data: {
                ...eventDetail.data,
                ...(result === 'available' ? {} : { retryCount: retries }),
              },
            },
          ]);
        } catch (error: any) {
          logger.warn({
            error: error.message,
            description: 'Failed processing message',
            messageId: sqsRecord.messageId,
          });
          batchItemFailures.push({ itemIdentifier: sqsRecord.messageId });
        }
      }),
    );

    const processedItemCount = receivedItemCount - batchItemFailures.length;
    logger.info(
      `${processedItemCount} of ${receivedItemCount} records processed successfully`,
    );

    return { batchItemFailures };
  };
