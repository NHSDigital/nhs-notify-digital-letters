import { EVENT_BUS_ARN, EVENT_BUS_DLQ_URL } from 'constants/backend-constants';
import { EventPublisher, eventBridgeClient, logger, sqsClient } from 'utils';
import type { MESHInboxMessageDownloaded } from 'digital-letters-events';
import eventValidator from 'digital-letters-events/MESHInboxMessageDownloaded.js';

const eventPublisher = new EventPublisher<MESHInboxMessageDownloaded>({
  eventBusArn: EVENT_BUS_ARN,
  dlqUrl: EVENT_BUS_DLQ_URL,
  logger,
  sqsClient,
  eventBridgeClient,
  validateEvent: eventValidator,
});

export default eventPublisher;
