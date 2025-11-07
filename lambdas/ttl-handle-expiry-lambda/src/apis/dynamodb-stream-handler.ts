import type { DynamoDBStreamEvent } from 'aws-lambda';
import { Logger } from 'utils';

export type CreateHandlerDependencies = {
  logger: Logger;
};

export const createHandler = ({
  logger,
}: CreateHandlerDependencies) => {
  return async (event: DynamoDBStreamEvent) => {
    logger.info({ description: 'DynamoDB event received', event });

    for (const record of event.Records) {
      logger.info({ description: 'Processing record', record });
    }

    const result = {};

    logger.info('Finished processing DynamoDB event', result);

    return result;
  };
};
