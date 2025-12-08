import {
  EventPublisher,
  dynamoClient,
  eventBridgeClient,
  logger,
  sqsClient,
} from 'utils';
import { loadConfig } from 'infra/config';
import { TtlRepository } from 'infra/ttl-repository';
import { CreateTtl } from 'app/create-ttl';
import { ItemEnqueued } from 'digital-letters-events';
import eventValidator from 'digital-letters-events/ItemEnqueued.js';

export const createContainer = () => {
  const {
    eventPublisherDlqUrl,
    eventPublisherEventBusArn,
    ttlShardCount,
    ttlTableName,
    ttlWaitTimeHours,
  } = loadConfig();

  const requestTtlRepository = new TtlRepository(
    ttlTableName,
    ttlWaitTimeHours,
    logger,
    dynamoClient,
    ttlShardCount,
  );

  const createTtl = new CreateTtl(requestTtlRepository, logger);

  const eventPublisher = new EventPublisher<ItemEnqueued>({
    eventBusArn: eventPublisherEventBusArn,
    dlqUrl: eventPublisherDlqUrl,
    logger,
    sqsClient,
    eventBridgeClient,
    validateEvent: eventValidator,
  });

  return {
    createTtl,
    eventPublisher,
    logger,
  };
};

export default createContainer;
