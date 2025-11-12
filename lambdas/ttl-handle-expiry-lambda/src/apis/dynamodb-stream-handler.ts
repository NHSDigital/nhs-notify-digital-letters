import type {
  DynamoDBBatchItemFailure,
  DynamoDBRecord,
  DynamoDBStreamEvent,
} from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { $TtlDynamodbRecord, EventPublisher, Logger } from 'utils';
import { randomUUID } from 'node:crypto';

export type CreateHandlerDependencies = {
  eventPublisher: EventPublisher;
  logger: Logger;
};

export const createHandler = ({
  eventPublisher,
  logger,
}: CreateHandlerDependencies) => {
  const processRecord = async (
    record: DynamoDBRecord,
    batchItemFailures: DynamoDBBatchItemFailure[],
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
        logger.error({
          err: parseError,
          description: 'Error parsing ttl dynamodb record',
        });

        batchItemFailures.push({
          itemIdentifier: record.dynamodb.SequenceNumber!,
        });

        return;
      }

      if ((item.ttl * 1000) > Date.now()) {
        await eventPublisher.sendEvents([
          {
            profileversion: '1.0.0',
            profilepublished: '2025-10',
            specversion: '1.0',
            id: randomUUID(),
            time: new Date().toISOString(),
            recordedtime: new Date().toISOString(),
            severitynumber: 5,
            traceparent:
              '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
            source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
            subject:
              'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
            type: 'uk.nhs.notify.digital.letters.expired.v1',
            datacontenttype: 'application/json',
            dataschema:
              'https://notify.nhs.uk/schemas/events/digital-letters/2025-10/digital-letters.schema.json',
            data: {
              'digital-letter-id': randomUUID(),
              messageReference: item.messageReference,
              messageUri: item.PK,
              senderId: item.senderId,
            },
          },
        ]);
      }
    } catch (error) {
      logger.error({
        err: error,
        description: 'Error parsing ttl dynamodb record',
      });

      batchItemFailures.push({
        itemIdentifier: record.dynamodb?.SequenceNumber!,
      });
    }
  };

  return async (event: DynamoDBStreamEvent) => {
    const batchItemFailures: DynamoDBBatchItemFailure[] = [];
    logger.info({ description: 'DynamoDB event received', event });

    for (const record of event.Records) {
      await processRecord(record, batchItemFailures);
    }

    const result = batchItemFailures.length > 0 ? { batchItemFailures } : {};

    logger.info('Finished processing DynamoDB event', result);

    return result;
  };
};
