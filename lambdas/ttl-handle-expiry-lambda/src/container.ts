import { EventPublisher, eventBridgeClient, logger, sqsClient } from 'utils';
import { CreateHandlerDependencies } from 'apis/dynamodb-stream-handler';
import { loadConfig } from 'infra/config';

export const createContainer = (): CreateHandlerDependencies => {
  const { eventPublisherDlqUrl, eventPublisherEventBusArn } = loadConfig();

  const eventPublisher = new EventPublisher({
    eventBusArn: eventPublisherEventBusArn,
    dlqUrl: eventPublisherDlqUrl,
    logger,
    sqsClient,
    eventBridgeClient,
  });

  return { eventPublisher, logger };
};

export default createContainer;
