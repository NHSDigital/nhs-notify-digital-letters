import { TtlRepository } from 'infra/ttl-repository';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { TtlItemEvent } from 'infra/types';

jest.useFakeTimers();

const randomNumber = 0.42;
const shardCount = 3;
const expectedShard = Math.floor(randomNumber * shardCount);
jest.spyOn(Math, 'random').mockReturnValue(randomNumber);

describe('TtlRepository', () => {
  let logger: any;
  let dynamoClient: any;
  let repo: TtlRepository;
  const tableName = 'table';
  const ttlWaitTimeHours = 24;
  const item: TtlItemEvent = {
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
    logger = { info: jest.fn(), error: jest.fn() };
    dynamoClient = { send: jest.fn().mockResolvedValue({}) };
    repo = new TtlRepository(
      tableName,
      ttlWaitTimeHours,
      logger,
      dynamoClient,
      shardCount,
    );
  });

  afterAll(() => {
    jest.mocked(Math.random).mockRestore();
  });

  it('logs and inserts item', async () => {
    const now = new Date('2020-01-01T12:00:00').getTime();
    jest.setSystemTime(now);
    const ttlWaitTimeSeconds = ttlWaitTimeHours * 60 * 60;
    const expectedTtlSeconds = Math.round(now / 1000) + ttlWaitTimeSeconds;
    const expectedTtlDate = new Date(expectedTtlSeconds * 1000)
      .toISOString()
      .split('T')[0];
    const expectedDateOfExpiry = `${expectedTtlDate}#${expectedShard}`;

    await repo.insertTtlRecord(item);

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Inserting item'),
      }),
    );

    const putCommand: PutCommand = dynamoClient.send.mock.calls[0][0];
    expect(putCommand.input).toStrictEqual({
      TableName: tableName,
      Item: {
        PK: item.data.uri,
        SK: 'TTL',
        ttl: expectedTtlSeconds,
        dateOfExpiry: expectedDateOfExpiry,
      },
    });
  });

  it('logs an error and throws on dynamo error', async () => {
    const error = new Error('fail');
    dynamoClient.send.mockRejectedValue(error);

    await expect(repo.insertTtlRecord(item)).rejects.toThrow(error);

    expect(logger.error).toHaveBeenCalledWith(
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

    await repo.insertTtlRecord(item);

    expect(gsiPk).toMatch(/^\d{4}-\d{2}-\d{2}#\d{1,2}$/);
  });
});
