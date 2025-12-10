import { EVENT_BUS_ARN, EVENT_BUS_DLQ_URL } from 'constants/backend-constants';
import { EventPublisher, eventBridgeClient, logger, sqsClient } from 'utils';

const eventPublisher = new EventPublisher({
  eventBusArn: EVENT_BUS_ARN,
  dlqUrl: EVENT_BUS_DLQ_URL,
  logger,
  sqsClient,
  eventBridgeClient,
});

export default eventPublisher;
