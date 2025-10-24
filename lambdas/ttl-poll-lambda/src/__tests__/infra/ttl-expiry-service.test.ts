import { Logger } from 'utils';
import { mock, mockReset } from 'jest-mock-extended';
import {
  BatchWriteCommandOutput,
  QueryCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { TtlExpiryService } from 'infra/ttl-expiry-service';
import { DynamoRepository } from 'infra/dynamo-repository';
import { TtlRecord } from 'infra/types';

const mockTableName = 'test';
const [mockDate] = new Date().toISOString().split('T');
const mockStartTimeMs = Date.now();
const mockTtlBeforeSeconds = Math.floor(mockStartTimeMs / 1000);
const mockTtl = mockTtlBeforeSeconds - 60;

const shardCount = 3;

const queryOutputNoItems: QueryCommandOutput = {
  Items: [],
  $metadata: {},
};

const queryOutput = {
  Items: [
    {
      PK: 'REQUEST_ITEM#hello1',
      SK: 'REQUEST_ITEM_PLAN#hello1',
      dateOfExpiry: mockDate,
      ttl: mockTtl,
    },
    {
      PK: 'REQUEST_ITEM#hello2',
      SK: 'REQUEST_ITEM_PLAN#hello2',
      dateOfExpiry: mockDate,
      ttl: mockTtl,
    },
    {
      PK: 'REQUEST_ITEM#hello3',
      SK: 'REQUEST_ITEM_PLAN#hello3',
      dateOfExpiry: mockDate,
      ttl: mockTtl,
    },
  ],
  $metadata: {},
} satisfies QueryCommandOutput & { Items: TtlRecord[] };

const batchWriteOutputFailedItem = {
  UnprocessedItems: {
    [mockTableName]: [
      {
        DeleteRequest: {
          Key: {
            PK: 'REQUEST_ITEM#hello2',
            SK: 'REQUEST_ITEM_PLAN#hello2',
          },
        },
      },
    ],
  },
  $metadata: {},
} satisfies BatchWriteCommandOutput;

const batchWriteOutputEmptyUnprocessedItems = {
  UnprocessedItems: {},
  $metadata: {},
} satisfies BatchWriteCommandOutput;

const batchWriteOutputUndefinedUnprocessedItems = {
  $metadata: {},
} satisfies BatchWriteCommandOutput;

const logger = mock<Logger>();

const mockDynamoRepository = mock<DynamoRepository>();

describe('TtlExpiryService', () => {
  const ttlExpiryService = new TtlExpiryService(
    mockTableName,
    logger,
    mockDynamoRepository,
    60,
    300,
    shardCount,
  );

  beforeEach(() => {
    mockReset(mockDynamoRepository);
    mockReset(logger);
    jest.clearAllMocks();
  });

  it('reports successful deletions with empty UnprocessedItems field', async () => {
    mockDynamoRepository.queryTtlIndex.mockImplementationOnce(
      async () => queryOutput,
    );
    mockDynamoRepository.deleteBatch.mockImplementationOnce(
      async () => batchWriteOutputEmptyUnprocessedItems,
    );

    const res = await ttlExpiryService.processExpiredTtlRecords(
      mockDate,
      mockTtlBeforeSeconds,
      mockStartTimeMs,
    );

    expect(mockDynamoRepository.queryTtlIndex).toHaveBeenCalledTimes(
      shardCount * 2,
    ); // 2 passes * 3 shards
    expect(mockDynamoRepository.deleteBatch).toHaveBeenCalledTimes(1);
    expect(res).toEqual({
      processed: 3,
      deleted: 3,
      failedToDelete: 0,
    });
  });

  it('reports successful deletions with undefined UnprocessedItems field', async () => {
    mockDynamoRepository.queryTtlIndex.mockImplementationOnce(
      async () => queryOutput,
    );
    mockDynamoRepository.deleteBatch.mockImplementationOnce(
      async () => batchWriteOutputUndefinedUnprocessedItems,
    );

    const res = await ttlExpiryService.processExpiredTtlRecords(
      mockDate,
      mockTtlBeforeSeconds,
      mockStartTimeMs,
    );

    expect(mockDynamoRepository.queryTtlIndex).toHaveBeenCalledTimes(
      shardCount * 2,
    );
    expect(mockDynamoRepository.deleteBatch).toHaveBeenCalledTimes(1);
    expect(res).toEqual({
      processed: 3,
      deleted: 3,
      failedToDelete: 0,
    });
  });

  it('reports failed items', async () => {
    mockDynamoRepository.queryTtlIndex.mockImplementationOnce(
      async () => queryOutput,
    );
    mockDynamoRepository.deleteBatch.mockImplementationOnce(
      async () => batchWriteOutputFailedItem,
    );

    const res = await ttlExpiryService.processExpiredTtlRecords(
      mockDate,
      mockTtlBeforeSeconds,
      mockStartTimeMs,
    );

    expect(mockDynamoRepository.queryTtlIndex).toHaveBeenCalledTimes(
      shardCount * 2,
    );
    expect(mockDynamoRepository.deleteBatch).toHaveBeenCalledTimes(1);
    expect(res).toEqual({
      processed: 3,
      deleted: 2,
      failedToDelete: 1,
    });
  });

  it('should not attempt to delete any items if no items are returned from index query', async () => {
    mockDynamoRepository.queryTtlIndex.mockImplementationOnce(
      async () => queryOutputNoItems,
    );

    const res = await ttlExpiryService.processExpiredTtlRecords(
      mockDate,
      mockTtlBeforeSeconds,
      mockStartTimeMs,
    );

    expect(mockDynamoRepository.queryTtlIndex).toHaveBeenCalledTimes(
      shardCount,
    ); // single pass
    expect(mockDynamoRepository.deleteBatch).toHaveBeenCalledTimes(0);
    expect(res).toEqual({
      processed: 0,
      deleted: 0,
      failedToDelete: 0,
    });
  });

  it('should retrieve  pages of results until no results found', async () => {
    let requestCount = 0;
    mockDynamoRepository.queryTtlIndex.mockImplementation(async () => {
      requestCount += 1;
      if (requestCount <= 9) {
        return queryOutput;
      }
      return queryOutputNoItems;
    });
    mockDynamoRepository.deleteBatch.mockImplementation(
      async () => batchWriteOutputEmptyUnprocessedItems,
    );

    const res = await ttlExpiryService.processExpiredTtlRecords(
      mockDate,
      mockTtlBeforeSeconds,
      mockStartTimeMs,
    );

    // 9 requests before empty, each pass makes 3 requests (so 9 / 3 = 3 passes)
    // and then one more to find empty (9 + 3 = 12)
    expect(mockDynamoRepository.queryTtlIndex).toHaveBeenCalledTimes(12);

    // One delete call for each pass
    expect(mockDynamoRepository.deleteBatch).toHaveBeenCalledTimes(3);

    // 9 requests before empty, each request returns 3 items, so 27 items total.
    expect(res).toEqual({
      processed: 27,
      deleted: 27,
      failedToDelete: 0,
    });
  });

  it('fetches only a single page of records when allowed runtime is exceeded', async () => {
    const ttlExpiryServiceZeroRuntime = new TtlExpiryService(
      mockTableName,
      logger,
      mockDynamoRepository,
      60,
      0,
      shardCount,
    );

    mockDynamoRepository.queryTtlIndex.mockResolvedValue(queryOutput);
    mockDynamoRepository.deleteBatch.mockResolvedValue(
      batchWriteOutputEmptyUnprocessedItems,
    );

    const res = await ttlExpiryServiceZeroRuntime.processExpiredTtlRecords(
      mockDate,
      mockTtlBeforeSeconds,
      mockStartTimeMs,
    );

    expect(mockDynamoRepository.queryTtlIndex).toHaveBeenCalledTimes(
      shardCount,
    );
    // 3 shards * 3 items = 9 -> one batch
    expect(mockDynamoRepository.deleteBatch).toHaveBeenCalledTimes(1);
    expect(res).toEqual({
      processed: 9,
      deleted: 9,
      failedToDelete: 0,
    });
  });

  it('does not attempt to delete when TTL records do not match schema', async () => {
    mockDynamoRepository.queryTtlIndex.mockImplementation(
      async () =>
        ({
          Items: [
            {
              PK: 'REQUEST_ITEM#hello1',
              SK: 'REQUEST_ITEM_PLAN#hello1',
              dateOfExpiry: 37_826_538_762,
              ttl: 'mockTtl',
            },
          ],
          $metadata: {},
        }) satisfies QueryCommandOutput,
    );

    const res = await ttlExpiryService.processExpiredTtlRecords(
      mockDate,
      mockTtlBeforeSeconds,
      mockStartTimeMs,
    );

    expect(mockDynamoRepository.queryTtlIndex).toHaveBeenCalledTimes(
      shardCount,
    );
    expect(mockDynamoRepository.deleteBatch).toHaveBeenCalledTimes(0);
    expect(res).toEqual({
      processed: 0,
      deleted: 0,
      failedToDelete: 0,
    });
  });

  it('does not attempt to delete when TTL records are more recent than expected', async () => {
    mockDynamoRepository.queryTtlIndex.mockImplementation(
      async () =>
        ({
          Items: [
            {
              PK: 'REQUEST_ITEM#hello1',
              SK: 'REQUEST_ITEM_PLAN#hello1',
              dateOfExpiry: mockDate,
              ttl: mockTtl,
            },
          ],
          $metadata: {},
        }) satisfies QueryCommandOutput,
    );

    const res = await ttlExpiryService.processExpiredTtlRecords(
      mockDate,
      mockTtlBeforeSeconds - 100,
      mockStartTimeMs,
    );

    expect(mockDynamoRepository.queryTtlIndex).toHaveBeenCalledTimes(
      shardCount,
    );
    expect(mockDynamoRepository.deleteBatch).toHaveBeenCalledTimes(0);
    expect(res).toEqual({
      processed: 0,
      deleted: 0,
      failedToDelete: 0,
    });
  });
});
