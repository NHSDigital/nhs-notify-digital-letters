import { EventPublisher, eventBridgeClient, logger, sqsClient } from 'utils';
import { CreateHandlerDependencies } from 'apis/dynamodb-stream-handler';
import { loadConfig } from 'infra/config';
import { Dlq } from 'app/dlq';
import { ItemDequeued } from 'digital-letters-events';
import eventValidator from 'digital-letters-events/ItemDequeued.js';

export const createContainer = (): CreateHandlerDependencies => {
  const { dlqUrl, eventPublisherDlqUrl, eventPublisherEventBusArn } =
    loadConfig();

  const eventPublisher = new EventPublisher<ItemDequeued>({
    eventBusArn: eventPublisherEventBusArn,
    dlqUrl: eventPublisherDlqUrl,
    logger,
    sqsClient,
    eventBridgeClient,
    validateEvent: eventValidator,
  });

  const dlq = new Dlq({
    dlqUrl,
    sqsClient,
    logger,
  });

  return { eventPublisher, logger, dlq };
};

export default createContainer;
