import {
  EventPublisher,
  ParameterStoreCache,
  dynamoClient,
  eventBridgeClient,
  logger,
  sqsClient,
} from 'utils';
import { loadConfig } from 'infra/config';
import { TtlRepository } from 'infra/ttl-repository';
import { CreateTtl } from 'app/create-ttl';
import { SenderRepository } from 'sender-management/src/infra/sender-repository/repository';

export const createContainer = () => {
  const {
    environment,
    eventPublisherDlqUrl,
    eventPublisherEventBusArn,
    ttlShardCount,
    ttlTableName,
  } = loadConfig();

  const parameterStore = new ParameterStoreCache();

  const senderRepository = new SenderRepository({
    config: { environment },
    logger,
    parameterStore,
  });

  const requestTtlRepository = new TtlRepository(
    ttlTableName,
    logger,
    dynamoClient,
    ttlShardCount,
    senderRepository,
  );

  const createTtl = new CreateTtl(requestTtlRepository, logger);

  const eventPublisher = new EventPublisher({
    eventBusArn: eventPublisherEventBusArn,
    dlqUrl: eventPublisherDlqUrl,
    logger,
    sqsClient,
    eventBridgeClient,
  });

  return {
    createTtl,
    eventPublisher,
    logger,
  };
};

export default createContainer;
