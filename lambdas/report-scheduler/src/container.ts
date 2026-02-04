import { loadConfig } from 'infra/config';
import { CreateHandlerDependencies } from 'apis/scheduled-event-handler';
import { SenderManagement } from 'sender-management';
import {
  EventPublisher,
  ParameterStoreCache,
  eventBridgeClient,
  logger,
  sqsClient,
} from 'utils';

export const createContainer = (): CreateHandlerDependencies => {
  const { eventPublisherDlqUrl, eventPublisherEventBusArn } = loadConfig();

  const parameterStore = new ParameterStoreCache();
  const senderManagement = SenderManagement({
    parameterStore,
  });

  const eventPublisher = new EventPublisher({
    eventBusArn: eventPublisherEventBusArn,
    dlqUrl: eventPublisherDlqUrl,
    logger,
    sqsClient,
    eventBridgeClient,
  });

  return { senderManagement, eventPublisher };
};

export default createContainer;
