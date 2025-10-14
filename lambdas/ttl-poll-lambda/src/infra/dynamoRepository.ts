import {
  BatchWriteCommandOutput,
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { Logger } from 'utils';

export class DynamoRepository {
  constructor(
    private readonly _tableName: string,
    private readonly _dynamoClient: DynamoDBDocumentClient,
    private readonly _logger: Logger,
    private readonly _deleteDynamoBatch: (
      tableName: string,
      Keys: Record<string, string>[],
      maxRetries: number,
      logger: Logger
    ) => Promise<BatchWriteCommandOutput>
  ) {}

  public async deleteBatch(
    Items: Record<string, NativeAttributeValue>[]
  ): Promise<BatchWriteCommandOutput> {
    return this._deleteDynamoBatch(this._tableName, Items, 10, this._logger);
  }

  public async queryTtlIndex(
    expiryDate: string,
    ttlBeforeSeconds: number
  ): Promise<QueryCommandOutput> {
    const command = new QueryCommand({
      TableName: this._tableName,
      IndexName: 'dateOfExpiryIndex',
      KeyConditionExpression:
        '#dateOfExpiry = :dateOfExpiry AND #ttl < :ttlBeforeSeconds',
      ExpressionAttributeNames: {
        '#dateOfExpiry': 'dateOfExpiry',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':dateOfExpiry': expiryDate,
        ':ttlBeforeSeconds': ttlBeforeSeconds,
      },
    });

    return this._dynamoClient.send(command);
  }
}
