import { dynamoClient, logger } from 'utils';
import { loadConfig } from 'infra/config';
import { TtlRepository } from 'infra/ttl-repository';
import { CreateTtl } from 'app/create-ttl';

export const createContainer = () => {
  const { ttlShardCount, ttlTableName, ttlWaitTimeHours } = loadConfig();

  const requestTtlRepository = new TtlRepository(
    ttlTableName,
    ttlWaitTimeHours,
    logger,
    dynamoClient,
    ttlShardCount,
  );

  const createTtl = new CreateTtl(requestTtlRepository, logger);

  return {
    createTtl,
    logger,
  };
};

export default createContainer;
