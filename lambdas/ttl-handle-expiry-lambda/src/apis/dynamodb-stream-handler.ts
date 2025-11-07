import type { DynamoDBStreamEvent } from 'aws-lambda';
import { EventPublisher, Logger } from 'utils';
import { randomUUID } from 'node:crypto';

export type CreateHandlerDependencies = {
  eventPublisher: EventPublisher;
  logger: Logger;
};

export const createHandler = ({
  eventPublisher,
  logger,
}: CreateHandlerDependencies) => {
  return async (event: DynamoDBStreamEvent) => {
    logger.info({ description: 'DynamoDB event received', event });

    for (const record of event.Records) {
      logger.info({ description: 'Processing record', record });
      await eventPublisher.sendEvents([
        {
          profileversion: '1.0.0',
          profilepublished: '2025-10',
          specversion: '1.0',
          id: randomUUID(),
          time: new Date().toISOString(),
          recordedtime: new Date().toISOString(),
          severitynumber: 6,
          traceparent:
            '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
          source: 'uk.nhs.notify.digital-letters.ttl-expiry',
          subject: 'temp-subject',
          type: 'uk.nhs.notify.digital.letters.letter.expired.v1',
          datacontenttype: 'application/json',
          dataschema:
            'https://notify.nhs.uk/schemas/events/digital-letters/2025-10/digital-letters.schema.json',
          data: {
            ...record,
            'digital-letter-id': randomUUID(),
          },
        },
      ]);
    }

    const result = {};

    logger.info('Finished processing DynamoDB event', result);

    return result;
  };
};
