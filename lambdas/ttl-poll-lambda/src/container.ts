import { logger } from 'utils';
import { deleteDynamoBatch, dynamoClient } from 'utils';
import { loadConfig } from './infra/config';
import { DynamoRepository } from './infra/dynamoRepository';
import { TtlExpiryService } from './infra/ttl-expiry-service';
import { CreateHandlerDependencies } from './apis/scheduled-event-handler';

export const createContainer = (): CreateHandlerDependencies => {
  const {
    ttlTableName,
    concurrency,
    maxProcessSeconds,
    writeShards,
  } = loadConfig();

  const dynamoRepository = new DynamoRepository(
    ttlTableName,
    dynamoClient,
    logger,
    deleteDynamoBatch
  );

  const ttlExpiryService = new TtlExpiryService(
    ttlTableName,
    logger,
    dynamoRepository,
    concurrency,
    maxProcessSeconds,
    writeShards
  );

  return { logger, ttlExpiryService };
};
