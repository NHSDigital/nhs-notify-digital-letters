import { EventPublisher, eventBridgeClient, logger, sqsClient } from 'utils';
import type { SqsHandlerDependencies } from 'apis/sqs-handler';
import { loadConfig } from 'infra/config';
import { MoveFileHandler } from 'app/move-file-handler';

export async function createContainer(): Promise<SqsHandlerDependencies> {
  const config = loadConfig();

  const { eventPublisherDlqUrl, eventPublisherEventBusArn } = config;

  const eventPublisher = new EventPublisher({
    eventBusArn: eventPublisherEventBusArn,
    dlqUrl: eventPublisherDlqUrl,
    logger,
    sqsClient,
    eventBridgeClient,
  });

  const moveFileHandler = new MoveFileHandler(logger, config);

  return {
    logger,
    moveFileHandler,
    eventPublisher,
  };
}
