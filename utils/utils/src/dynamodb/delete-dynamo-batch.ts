import {
  BatchWriteCommand,
  BatchWriteCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { promisify } from 'node:util';
import { dynamoDocumentClient } from './dynamo-client';
import { Logger } from '../logger';

const sleep = promisify(setTimeout);

export async function deleteDynamoBatch(
  TableName: string,
  Keys: Record<string, string>[],
  logger: Logger,
  maxRetries = 10,
): Promise<BatchWriteCommandOutput> {
  let remainingRequests: BatchWriteCommandOutput['UnprocessedItems'] = {
    [TableName]: Keys.map((item) => ({
      DeleteRequest: {
        Key: item,
      },
    })),
  };

  let retryAttempt = 0;
  let results: BatchWriteCommandOutput = {
    $metadata: {},
  };

  while (Keys.length > 0 && remainingRequests && retryAttempt <= maxRetries) {
    if (retryAttempt > 0) {
      const delaySeconds = 1.4 ** retryAttempt;
      logger.warn(
        `Attempt ${retryAttempt}: ${remainingRequests[TableName].length} unprocessed batch delete requests. Waiting ${delaySeconds} seconds before retrying`,
      );

      await sleep(delaySeconds * 1000);
    }

    const command = new BatchWriteCommand({
      RequestItems: remainingRequests,
    });

    results = await dynamoDocumentClient.send(command);
    remainingRequests = undefined;

    if (results?.UnprocessedItems?.[TableName]) {
      remainingRequests = results.UnprocessedItems;
    }
    retryAttempt += 1;
  }

  return results;
}
