import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
import {
  SQS_URL_PREFIX,
  TEST_OBSERVER_QUEUE_NAME,
} from 'constants/backend-constants';
import { sqsClient } from 'utils';

const queueUrl = `${SQS_URL_PREFIX}${TEST_OBSERVER_QUEUE_NAME}`;

/**
 * Polls the test observer SQS queue for an event matching the given type and predicate.
 * Deletes the matched message from the queue and returns the event detail.
 *
 * The test observer queue is subscribed to the EventBridge bus and receives all
 * uk.nhs.notify.digital.letters.* events.
 *
 * Unmatched messages are immediately returned to the queue (VisibilityTimeout: 0)
 * so concurrent tests are not starved.
 */
export async function expectEventOnTestObserverQueue(
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
              VisibilityTimeout: 5,
            }),
          );
        } catch {
        }
      }
    }
  }

  throw new Error(
    `Event of type "${eventType}" not found on test observer queue within ${timeoutMs}ms`,
  );
}
