import { EventPublisher, eventBridgeClient, logger, sqsClient } from 'utils';
import { CreateHandlerDependencies } from 'apis/dynamodb-stream-handler';
import { loadConfig } from 'infra/config';
import { Dlq } from 'app/dlq';

export const createContainer = (): CreateHandlerDependencies => {
  const { dlqUrl, eventPublisherDlqUrl, eventPublisherEventBusArn } =
    loadConfig();

  const eventPublisher = new EventPublisher({
    eventBusArn: eventPublisherEventBusArn,
    dlqUrl: eventPublisherDlqUrl,
    logger,
    sqsClient,
    eventBridgeClient,
  });

  const dlq = new Dlq({
    dlqUrl,
    sqsClient,
    logger,
  });

  return { eventPublisher, logger, dlq };
};

export default createContainer;
