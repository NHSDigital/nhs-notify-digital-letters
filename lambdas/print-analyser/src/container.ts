import { HandlerDependencies } from 'apis/sqs-handler';
import { loadConfig } from 'infra/config';
import { EventPublisher, eventBridgeClient, logger, sqsClient } from 'utils';

export const createContainer = (): HandlerDependencies => {
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
