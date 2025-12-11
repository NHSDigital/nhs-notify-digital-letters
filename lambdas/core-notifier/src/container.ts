import {
  ParameterStoreCache,
  createGetApimAccessToken,
  logger,
} from 'utils';
import { NotifyClient } from 'app/notify-api-client';
import { NotifyMessageProcessor } from 'app/notify-message-processor';
import type { SqsHandlerDependencies } from 'apis/sqs-handler';
import { loadConfig } from 'infra/config';
import { SenderRepository } from 'sender-management/src/infra/sender-repository';

export async function createContainer(): Promise<SqsHandlerDependencies> {
  const parameterStore = new ParameterStoreCache();
  const config = loadConfig();
  const senderRepository = new SenderRepository({
    config,
    logger,
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
    notifyMessageProcessor: notifyMessageProcessor,
    logger,
    senderRepository
  };
}
