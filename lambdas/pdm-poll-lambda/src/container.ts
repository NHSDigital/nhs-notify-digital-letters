import { HandlerDependencies } from 'apis/sqs-handler';
import { Pdm } from 'app/pdm';
import { loadConfig } from 'infra/config';
import {
  EventPublisher,
  ParameterStoreCache,
  PdmClient,
  createGetApimAccessToken,
  eventBridgeClient,
  logger,
  sqsClient,
} from 'utils';

export const createContainer = (): HandlerDependencies => {
  const {
    apimAccessTokenSsmParameterName,
    apimBaseUrl,
    eventPublisherDlqUrl,
    eventPublisherEventBusArn,
    pollMaxRetries,
  } = loadConfig();

  const eventPublisher = new EventPublisher({
    eventBusArn: eventPublisherEventBusArn,
    dlqUrl: eventPublisherDlqUrl,
    logger,
    sqsClient,
    eventBridgeClient,
  });

  const parameterStore = new ParameterStoreCache();

  const accessTokenRepository = {
    getAccessToken: createGetApimAccessToken(
      apimAccessTokenSsmParameterName,
      logger,
      parameterStore,
    ),
  };

  const pdmClient = new PdmClient(accessTokenRepository, apimBaseUrl, logger);

  const pdm = new Pdm({
    pdmClient,
    logger,
  });

  return { eventPublisher, logger, pdm, pollMaxRetries };
};

export default createContainer;
