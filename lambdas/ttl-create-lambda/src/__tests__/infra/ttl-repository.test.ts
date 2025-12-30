import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { TtlRepository } from 'infra/ttl-repository';
import { MESHInboxMessageDownloaded } from 'digital-letters-events';

jest.useFakeTimers();

const randomNumber = 0.42;
const shardCount = 3;
const ttlWaitTimeSeconds = 24 * 60 * 60;
const expectedShard = Math.floor(randomNumber * shardCount);
jest.spyOn(Math, 'random').mockReturnValue(randomNumber);

describe('TtlRepository', () => {
  let logger: any;
  let dynamoClient: any;
  let senderRepository: any;
  let repo: TtlRepository;
  const tableName = 'table';
  const item: MESHInboxMessageDownloaded = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    specversion: '1.0',
    source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    type: 'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1',
    time: '2023-06-20T12:00:00Z',
    recordedtime: '2023-06-20T12:00:00.250Z',
    severitynumber: 2,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-mesh-inbox-message-downloaded-data.schema.json',
    severitytext: 'INFO',
    data: {
      messageReference: 'ref1',
      senderId: 'sender1',
      messageUri: 'https://example.com/ttl/resource',
    },
  };

  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() };
    dynamoClient = { send: jest.fn().mockResolvedValue({}) };
    senderRepository = {
      getSender: jest
        .fn()
        .mockResolvedValue({ fallbackWaitTimeSeconds: ttlWaitTimeSeconds }),
    };
    repo = new TtlRepository(
      tableName,
      logger,
      dynamoClient,
      shardCount,
      senderRepository,
    );
  });

  afterAll(() => {
    jest.mocked(Math.random).mockRestore();
  });

  it('logs and inserts item', async () => {
    const now = new Date('2020-01-01T12:00:00').getTime();
    jest.setSystemTime(now);
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

    expect(senderRepository.getSender).toHaveBeenCalledWith(item.data.senderId);

    const putCommand: PutCommand = dynamoClient.send.mock.calls[0][0];
    expect(putCommand.input).toStrictEqual({
      TableName: tableName,
      Item: {
        PK: item.data.messageUri,
        SK: 'TTL',
        dateOfExpiry: expectedDateOfExpiry,
        event: item,
        ttl: expectedTtlSeconds,
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

  it('throws and logs error when sender not found', async () => {
    senderRepository.getSender.mockResolvedValue(null);

    await expect(repo.insertTtlRecord(item)).rejects.toThrow(
      `Sender not found for sender ID ${item.data.senderId}`,
    );

    expect(logger.error).toHaveBeenCalledWith({
      description: `Sender not found for sender ID ${item.data.senderId}`,
    });
  });
});
