import {
  EventPublisher,
  ParameterStoreCache,
  createGetApimAccessToken,
  eventBridgeClient,
  logger,
  sqsClient,
} from 'utils';
import { NotifyClient } from 'app/notify-api-client';
import { NotifyMessageProcessor } from 'app/notify-message-processor';
import type { SqsHandlerDependencies } from 'apis/sqs-handler';
import { loadConfig } from 'infra/config';
import { SenderManagement } from 'sender-management';
import { EventPublisherFacade } from 'infra/event-publisher-facade';

export async function createContainer(): Promise<SqsHandlerDependencies> {
  const parameterStore = new ParameterStoreCache();
  const config = loadConfig();
  const senderManagement = SenderManagement({
    parameterStore,
  });

  const accessTokenRepository = {
    getAccessToken: createGetApimAccessToken(
      config.apimAccessTokenSsmParameterName,
      logger,
      parameterStore,
    ),
  };

  const notifyClient = new NotifyClient(
    config.apimBaseUrl,
    accessTokenRepository,
    logger,
  );

  const notifyMessageProcessor = new NotifyMessageProcessor({
    nhsNotifyClient: notifyClient,
    logger,
  });

  const { eventPublisherDlqUrl, eventPublisherEventBusArn } = config;

  const eventPublisherFacade = new EventPublisherFacade(
    new EventPublisher({
      eventBusArn: eventPublisherEventBusArn,
      dlqUrl: eventPublisherDlqUrl,
      logger,
      sqsClient,
      eventBridgeClient,
    }),
    new EventPublisher({
      eventBusArn: eventPublisherEventBusArn,
      dlqUrl: eventPublisherDlqUrl,
      logger,
      sqsClient,
      eventBridgeClient,
    }),
    new EventPublisher({
      eventBusArn: eventPublisherEventBusArn,
      dlqUrl: eventPublisherDlqUrl,
      logger,
      sqsClient,
      eventBridgeClient,
    }),
    logger,
  );

  return {
    logger,
    notifyMessageProcessor,
    senderManagement,
    eventPublisherFacade,
  };
}
