import { DeleteCommand, DeleteCommandOutput } from '@aws-sdk/lib-dynamodb';
import { TtlRecord } from 'types/types';

interface IDynamoCaller {
  send: (updateCommand: DeleteCommand) => Promise<DeleteCommandOutput>;
}

export class TtlRepository {
  constructor(
    private readonly tableName: string,
    private readonly dynamoDocumentClient: IDynamoCaller,
  ) {}

  public async delete(messageReference: string) {
    const params = {
      TableName: this.tableName,
      Key: {
        PK: {
          S: messageReference,
        },
        SK: {
          S: 'TTL',
        },
      },
      ReturnValues: 'ALL_OLD' as const,
    };
    const request = new DeleteCommand(params);
    const output = await this.dynamoDocumentClient.send(request);

    return output.Attributes as TtlRecord | undefined;
  }
}

export default TtlRepository;
