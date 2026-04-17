import { UpdateCommand, UpdateCommandOutput } from '@aws-sdk/lib-dynamodb';
import { TtlRecord } from 'types/types';

interface IDynamoCaller {
  send: (command: UpdateCommand) => Promise<UpdateCommandOutput>;
}

export class TtlRepository {
  constructor(
    private readonly tableName: string,
    private readonly dynamoDocumentClient: IDynamoCaller,
  ) {}

  public async markWithdrawn(messageReference: string) {
    const params = {
      TableName: this.tableName,
      Key: {
        PK: messageReference,
        SK: 'TTL',
      },
      UpdateExpression: 'set withdrawn = :val1',
      ExpressionAttributeValues: {
        ':val1': true,
      },
      ReturnValues: 'ALL_NEW' as const,
    };
    const request = new UpdateCommand(params);
    const output = await this.dynamoDocumentClient.send(request);

    return output.Attributes as TtlRecord | undefined;
  }
}

export default TtlRepository;
