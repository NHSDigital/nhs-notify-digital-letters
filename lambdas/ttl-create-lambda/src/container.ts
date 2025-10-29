import { dynamoClient, EventPublisher, logger } from 'utils';
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

  const eventPublisher = new EventPublisher({
    eventBusArn: loadConfig().eventPublishBusArn,
    dlqUrl: loadConfig().eventPublishDlqUrl,
    logger,
  });

  return {
    createTtl,
    eventPublisher,
    logger,
  };
};

export default createContainer;
