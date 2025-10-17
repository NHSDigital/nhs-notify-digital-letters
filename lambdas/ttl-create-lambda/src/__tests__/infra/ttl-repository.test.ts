import { TtlRepository } from 'infra/ttl-repository';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

describe('TtlRepository', () => {
  let logger: any;
  let dynamoClient: any;
  let repo: TtlRepository;
  const tableName = 'table';
  const ttlWaitTimeHours = 24;
  const item = {
    data: { uri: 'uri' },
    id: 'id',
    source: 'src',
    specversion: '1',
    type: 't',
    plane: 'p',
    subject: 's',
    time: 'now',
    datacontenttype: 'json',
    dataschema: 'sch',
    dataschemaversion: '1',
  };

  beforeEach(() => {
    logger = { info: jest.fn(), warn: jest.fn() };
    dynamoClient = { send: jest.fn().mockResolvedValue({}) };
    repo = new TtlRepository(tableName, ttlWaitTimeHours, logger, dynamoClient);
  });

  it('logs and inserts item', async () => {
    await repo.insertTtlRecord(item as any);

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Inserting item'),
      }),
    );
    expect(dynamoClient.send).toHaveBeenCalledWith(expect.any(PutCommand));
  });

  it('warns and throws on dynamo error', async () => {
    const error = new Error('fail');
    dynamoClient.send.mockRejectedValue(error);

    await expect(repo.insertTtlRecord(item as any)).rejects.toThrow(error);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Failed to insert TTL record'),
        err: error,
      }),
    );
  });

  it('GSI PK is formatted as YYYY-MM-DD#<int>', async () => {
    let gsiPk: string | undefined;
    dynamoClient.send.mockImplementation((cmd: PutCommand) => {
      gsiPk = (cmd.input.Item as any).dateOfExpiry;
      return Promise.resolve({});
    });

    await repo.insertTtlRecord(item as any);

    expect(gsiPk).toMatch(/^\d{4}-\d{2}-\d{2}#\d{1,2}$/);
  });
});
