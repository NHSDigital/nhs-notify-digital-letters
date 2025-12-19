import {
  DeleteMessageBatchCommand,
  ReceiveMessageCommand,
  ReceiveMessageCommandInput,
} from '@aws-sdk/client-sqs';
import { expect } from '@playwright/test';
import { SQS_URL_PREFIX } from 'constants/backend-constants';
import { sqsClient } from 'utils';
import expectToPassEventually from 'helpers/expectations';

function getQueueUrl(queueName: string) {
  return `${SQS_URL_PREFIX}${queueName}`;
}

export async function expectMessageContainingString(
  queueName: string,
  searchTerm: string,
  timeout = 30,
) {
  const input: ReceiveMessageCommandInput = {
    QueueUrl: getQueueUrl(queueName),
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 1,
    VisibilityTimeout: 2,
  };

  await expectToPassEventually(async () => {
    const result = await sqsClient.send(new ReceiveMessageCommand(input));
    const polledMessages = result.Messages || [];

    expect(polledMessages.some((m) => m.Body?.includes(searchTerm))).toBe(true);
  }, timeout);
}

export async function purgeQueue(queueName: string) {
  const queueUrl = getQueueUrl(queueName);

  for (;;) {
    const result = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 1,
      }),
    );

    const messages = result.Messages || [];

    if (messages.length === 0) {
      break;
    }

    await sqsClient.send(
      new DeleteMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: messages.map((msg, index) => ({
          Id: index.toString(),
          ReceiptHandle: msg.ReceiptHandle!,
        })),
      }),
    );
  }
}
