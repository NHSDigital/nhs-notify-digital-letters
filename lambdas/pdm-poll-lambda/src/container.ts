import { HandlerDependencies } from 'apis/sqs-handler';
import { Pdm } from 'app/pdm';
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

  const pdm = new Pdm({
    pdmUrl: 'pdmUrl',
    logger,
  });

  return { eventPublisher, pdm, logger };
};

export default createContainer;
