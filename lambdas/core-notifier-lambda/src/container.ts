import { ParameterStoreCache, createGetApimAccessToken, logger } from 'utils';
import { NotifyClient } from 'app/notify-api-client';
import { NotifyMessageProcessor } from 'app/notify-message-processor';
import type { SqsHandlerDependencies } from 'apis/sqs-handler';
import { loadConfig } from 'infra/config';
import { SenderManagement } from 'sender-management';

export async function createContainer(): Promise<SqsHandlerDependencies> {
  const parameterStore = new ParameterStoreCache();
  const config = loadConfig();
  const senderManagement = new SenderManagement({
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

  return {
    notifyMessageProcessor,
    logger,
    senderManagement,
  };
}
