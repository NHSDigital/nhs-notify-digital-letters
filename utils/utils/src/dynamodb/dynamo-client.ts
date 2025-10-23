import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { region } from '../locations';

export const getDynamoClient = (
  additionalOptions: Partial<DynamoDBClientConfig> = {},
) =>
  new DynamoDBClient({
    region: region(),
    retryMode: 'standard',
    maxAttempts: 10,
    ...additionalOptions,
  });

export const dynamoClient = getDynamoClient();

export const createDynamoDocumentClient = (
  providedDynamoClient: DynamoDBClient,
) =>
  DynamoDBDocumentClient.from(providedDynamoClient, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

export const dynamoDocumentClient = createDynamoDocumentClient(dynamoClient);
