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
      logger: Logger,
      maxRetries: number,
    ) => Promise<BatchWriteCommandOutput>,
  ) {}

  public async deleteBatch(
    Items: Record<string, NativeAttributeValue>[],
  ): Promise<BatchWriteCommandOutput> {
    return this._deleteDynamoBatch(this._tableName, Items, this._logger, 10);
  }

  public async queryTtlIndex(
    expiryDate: string,
    ttlBeforeSeconds: number,
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

export default DynamoRepository;
