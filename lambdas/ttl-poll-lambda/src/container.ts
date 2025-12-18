import { deleteDynamoBatch, dynamoDocumentClient, logger } from 'utils';
import { loadConfig } from 'infra/config';
import { DynamoRepository } from 'infra/dynamo-repository';
import { TtlExpiryService } from 'infra/ttl-expiry-service';
import { CreateHandlerDependencies } from 'apis/scheduled-event-handler';

export const createContainer = (): CreateHandlerDependencies => {
  const { concurrency, maxProcessSeconds, ttlShardCount, ttlTableName } =
    loadConfig();

  const dynamoRepository = new DynamoRepository(
    ttlTableName,
    dynamoDocumentClient,
    logger,
    deleteDynamoBatch,
  );

  const ttlExpiryService = new TtlExpiryService(
    ttlTableName,
    logger,
    dynamoRepository,
    concurrency,
    maxProcessSeconds,
    ttlShardCount,
  );

  return { logger, ttlExpiryService };
};

export default createContainer;
