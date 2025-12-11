import {
  EventPublisher,
  ParameterStoreCache,
  createGetApimAccessToken,
  eventBridgeClient,
  logger,
  sqsClient,
} from 'utils';
import { NotifyClient } from 'app/notify-api-client';
import { MessageProcessor } from 'app/message-processor';
import type { SqsHandlerDependencies } from 'apis/sqs-handler';
import { loadConfig } from 'infra/config';
import { SenderManagement } from 'sender-management';

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

  const notifyMessageProcessor = new MessageProcessor({
    nhsNotifyClient: notifyClient,
    logger,
  });

  const { eventPublisherDlqUrl, eventPublisherEventBusArn } = config;

  const eventPublisher = new EventPublisher({
    eventBusArn: eventPublisherEventBusArn,
    dlqUrl: eventPublisherDlqUrl,
    logger,
    sqsClient,
    eventBridgeClient,
  });

  return {
    logger,
    notifyMessageProcessor,
    senderManagement,
    eventPublisher,
  };
}
