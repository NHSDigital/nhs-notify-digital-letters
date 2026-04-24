import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
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

export const MESH_OBSERVER_QUEUE_URL = `${SQS_URL_PREFIX}${TEST_OBSERVER_MESH_QUEUE_NAME}`;
export const PDM_OBSERVER_QUEUE_URL = `${SQS_URL_PREFIX}${TEST_OBSERVER_PDM_QUEUE_NAME}`;
export const MESSAGES_OBSERVER_QUEUE_URL = `${SQS_URL_PREFIX}${TEST_OBSERVER_MESSAGES_QUEUE_NAME}`;
export const PRINT_OBSERVER_QUEUE_URL = `${SQS_URL_PREFIX}${TEST_OBSERVER_PRINT_QUEUE_NAME}`;
export const QUEUE_ITEMS_OBSERVER_QUEUE_URL = `${SQS_URL_PREFIX}${TEST_OBSERVER_QUEUE_ITEMS_QUEUE_NAME}`;
export const REPORTING_OBSERVER_QUEUE_URL = `${SQS_URL_PREFIX}${TEST_OBSERVER_REPORTING_QUEUE_NAME}`;

/**
 * Polls a test observer SQS queue for an event matching the given type and predicate.
 * Deletes the matched message from the queue and returns the event detail.
 *
 * Each queue subscribes to a filtered subset of uk.nhs.notify.digital.letters.* events
 * Unmatched messages are immediately returned (VisibilityTimeout: 0) so concurrent
 * tests within the same spec are not starved.
 */
export async function expectEventOnTestObserverQueue(
  queueUrl: string,
  eventType: string,
  matchFn: (detail: Record<string, unknown>) => boolean,
  timeoutMs = 80_000,
): Promise<Record<string, unknown>> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const { Messages = [] } = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 10,
        VisibilityTimeout: 30,
      }),
    );

    for (const msg of Messages) {
      if (msg.Body) {
        const envelope = JSON.parse(msg.Body) as Record<string, unknown>;
        const detailType = envelope['detail-type'] as string | undefined;
        const detail = envelope.detail as Record<string, unknown> | undefined;

        if (detailType === eventType && detail && matchFn(detail)) {
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: msg.ReceiptHandle!,
            }),
          );
          return detail;
        }

        // Immediately return unmatched messages so concurrent tests are not starved
        try {
          await sqsClient.send(
            new ChangeMessageVisibilityCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: msg.ReceiptHandle!,
              VisibilityTimeout: 0,
            }),
          );
        } catch {
          // Receipt handle already expired. SQS returns the message automatically
        }
      }
    }
  }

  throw new Error(
    `Event of type "${eventType}" not found on test observer queue within ${timeoutMs}ms`,
  );
}
