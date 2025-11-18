import type {
  DynamoDBBatchItemFailure,
  DynamoDBRecord,
  DynamoDBStreamEvent,
} from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
  $TtlDynamodbRecord,
  $TtlItemEvent,
  EventPublisher,
  Logger,
} from 'utils';
import { randomUUID } from 'node:crypto';
import { Dlq } from 'app/dlq';

export type CreateHandlerDependencies = {
  dlq: Dlq;
  eventPublisher: EventPublisher;
  logger: Logger;
};

export const createHandler = ({
  dlq,
  eventPublisher,
  logger,
}: CreateHandlerDependencies) => {
  const processRecord = async (
    record: DynamoDBRecord,
    failures: DynamoDBRecord[],
  ): Promise<void> => {
    try {
      logger.info({
        description: 'Processing DynamoDB event record',
        record,
      });

      if (record.eventName !== 'REMOVE' || !record.dynamodb?.OldImage) {
        // This shouldn't happen unless the stream filter has been changed.
        logger.error({
          description: 'Non-REMOVE event or missing OldImage',
          record,
        });

        return;
      }

      const {
        data: item,
        error: parseError,
        success: parseSuccess,
      } = $TtlDynamodbRecord.safeParse(
        unmarshall(record.dynamodb.OldImage as any),
      );

      if (!parseSuccess) {
        logger.warn({
          err: parseError,
          description: 'Error parsing ttl dynamodb record',
        });

        failures.push(record);

        return;
      }

      const {
        data: itemEvent,
        error: eventParseError,
        success: eventParseSuccess,
      } = $TtlItemEvent.safeParse(item.event);

      if (!eventParseSuccess) {
        logger.warn({
          err: eventParseError,
          description: 'Error parsing ttl item event',
        });

        failures.push(record);

        return;
      }

      if (item.withdrawn) {
        logger.info({
          description: 'ItemDequeued event not sent as item withdrawn',
          messageReference: itemEvent.data.messageReference,
          messageUri: item.PK,
          senderId: itemEvent.data.senderId,
        });
      } else {
        await eventPublisher.sendEvents([
          {
            ...itemEvent,
            id: randomUUID(),
            time: new Date().toISOString(),
            recordedtime: new Date().toISOString(),
            type: 'uk.nhs.notify.digital.letters.queue.item.dequeued.v1',
          },
        ]);
      }
    } catch (error) {
      logger.warn({
        err: error,
        description: 'Error processing ttl dynamodb record',
      });

      failures.push(record);
    }
  };

  return async (event: DynamoDBStreamEvent) => {
    const failures: DynamoDBRecord[] = [];
    const batchItemFailures: DynamoDBBatchItemFailure[] = [];
    logger.info({ description: 'DynamoDB event received', event });

    for (const record of event.Records) {
      await processRecord(record, failures);
    }

    if (failures.length > 0) {
      const dlqFailures = await dlq.send(failures);

      for (const dlqFailure of dlqFailures) {
        batchItemFailures.push({
          itemIdentifier: dlqFailure.dynamodb?.SequenceNumber!,
        });
      }
    }

    const result = batchItemFailures.length > 0 ? { batchItemFailures } : {};

    logger.info('Finished processing DynamoDB event', result);

    return result;
  };
};
