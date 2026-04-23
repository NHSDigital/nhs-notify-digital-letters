import { PurgeQueueCommand } from '@aws-sdk/client-sqs';
import { test as setup } from '@playwright/test';
import {
  SQS_URL_PREFIX,
  TEST_OBSERVER_QUEUE_NAME,
} from 'constants/backend-constants';
import { sqsClient } from 'utils';

setup('Purge test observer queue', async () => {
  await sqsClient.send(
    new PurgeQueueCommand({
      QueueUrl: `${SQS_URL_PREFIX}${TEST_OBSERVER_QUEUE_NAME}`,
    }),
  );
});
