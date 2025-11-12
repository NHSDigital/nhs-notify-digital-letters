import type {
  DynamoDBBatchItemFailure,
  DynamoDBRecord,
  DynamoDBStreamEvent,
} from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { $TtlDynamodbRecord, EventPublisher, Logger } from 'utils';
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

      if (item.ttl * 1000 > Date.now()) {
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
            source:
              '/nhs/england/notify/production/primary/data-plane/digital-letters',
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
