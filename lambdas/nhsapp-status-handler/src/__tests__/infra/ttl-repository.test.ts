import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { nhsAppStatusEvent } from '__tests__/data';
import { TtlRepository } from 'infra/ttl-repository';

describe('TtlRepository', () => {
  let dynamoDocumentClient: any;
  let repo: TtlRepository;
  const tableName = 'table';

  beforeEach(() => {
    dynamoDocumentClient = { send: jest.fn().mockResolvedValue({}) };
    repo = new TtlRepository(tableName, dynamoDocumentClient);
  });

  it('deletes item', async () => {
    await repo.delete(nhsAppStatusEvent.data.messageReference);

    const deleteCommand: DeleteCommand =
      dynamoDocumentClient.send.mock.calls[0][0];
    expect(deleteCommand.input).toStrictEqual({
      TableName: tableName,
      Key: {
        PK: { S: nhsAppStatusEvent.data.messageReference },
        SK: { S: 'TTL' },
      },
      ReturnValues: 'ALL_OLD',
    });
  });

  it('errors on dynamo error', async () => {
    const error = new Error('fail');
    dynamoDocumentClient.send.mockRejectedValue(error);

    await expect(
      repo.delete(nhsAppStatusEvent.data.messageReference),
    ).rejects.toThrow(error);
  });
});
