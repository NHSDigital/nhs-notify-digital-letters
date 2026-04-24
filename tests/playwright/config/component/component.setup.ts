import { PurgeQueueCommand } from '@aws-sdk/client-sqs';
import { test as setup } from '@playwright/test';
import {
  SQS_URL_PREFIX,
  TEST_OBSERVER_MESH_QUEUE_NAME,
  TEST_OBSERVER_MESSAGES_QUEUE_NAME,
  TEST_OBSERVER_PDM_QUEUE_NAME,
  TEST_OBSERVER_PRINT_QUEUE_NAME,
  TEST_OBSERVER_QUEUE_ITEMS_QUEUE_NAME,
  TEST_OBSERVER_REPORTING_QUEUE_NAME,
} from 'constants/backend-constants';
import { sqsClient } from 'utils';

const queues = [
  TEST_OBSERVER_MESH_QUEUE_NAME,
  TEST_OBSERVER_MESSAGES_QUEUE_NAME,
  TEST_OBSERVER_PDM_QUEUE_NAME,
  TEST_OBSERVER_PRINT_QUEUE_NAME,
  TEST_OBSERVER_QUEUE_ITEMS_QUEUE_NAME,
  TEST_OBSERVER_REPORTING_QUEUE_NAME,
];

setup('Purge test observer queues', async () => {
  await Promise.all(
    queues.map((name) =>
      sqsClient.send(
        new PurgeQueueCommand({ QueueUrl: `${SQS_URL_PREFIX}${name}` }),
      ),
    ),
  );
});
