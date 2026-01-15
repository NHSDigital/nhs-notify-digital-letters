import { EventPublisher, eventBridgeClient, logger, sqsClient } from 'utils';
import { loadConfig } from 'infra/config';
import { PrintSender } from 'app/print-sender';

export const createContainer = () => {
  const {
    accountType,
    environment,
    eventPublisherDlqUrl,
    eventPublisherEventBusArn,
  } = loadConfig();

  const eventPublisher = new EventPublisher({
    eventBusArn: eventPublisherEventBusArn,
    dlqUrl: eventPublisherDlqUrl,
    logger,
    sqsClient,
    eventBridgeClient,
  });

  const printSender = new PrintSender(
    eventPublisher,
    environment,
    accountType,
    logger,
  );

  return {
    printSender,
    logger,
  };
};

export default createContainer;
