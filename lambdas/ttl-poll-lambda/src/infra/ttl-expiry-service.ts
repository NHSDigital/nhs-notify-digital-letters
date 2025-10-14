import { Logger } from 'utils';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import { QueryCommandOutput } from '@aws-sdk/lib-dynamodb';
import { DynamoRepository } from './dynamoRepository';
import { isTtlRecord, ProcessingStatistics, TtlRecordKey } from './types';

export class TtlExpiryService {
  private readonly limit: pLimit.Limit;

  constructor(
    private readonly tableName: string,
    private readonly logger: Logger,
    private readonly dynamoRepository: DynamoRepository,
    concurrency: number,
    private readonly maxProcessSeconds: number,
    private readonly writeShards: number
  ) {
    this.limit = pLimit(concurrency);
  }

  public async processExpiredTtlRecords(
    date: string,
    ttlBeforeSeconds: number,
    startTimeMs: number
  ): Promise<ProcessingStatistics> {
    const stats = {
      processed: 0,
      deleted: 0,
      failedToDelete: 0,
    };

    let records = await this.getTtlRecordKeys(date, ttlBeforeSeconds);
    const runUntil = startTimeMs + this.maxProcessSeconds * 1000;
    while (records.length) {
      const { deleted, failedToDelete, processed } =
        await this.batchDeleteTtlRecords(records);
      stats.processed += processed;
      stats.deleted += deleted;
      stats.failedToDelete += failedToDelete;

      if (Date.now() > runUntil) {
        this.logger.warn(
          `Exceeded allowed runtime of ${this.maxProcessSeconds} seconds`
        );
        break;
      }
      records = await this.getTtlRecordKeys(date, ttlBeforeSeconds);
    }

    return stats;
  }

  private async getTtlRecordKeys(
    date: string,
    ttlBeforeSeconds: number
  ): Promise<TtlRecordKey[]> {
    const shards = [...Array(this.writeShards).keys()];
    this.logger.info(
      'Querying %d shards for expired records on %s before %s',
      this.writeShards,
      date,
      new Date(ttlBeforeSeconds * 1000).toISOString()
    );

    const promises = shards.map(async (shard) =>
      this.queryDynamo(date, shard, ttlBeforeSeconds)
    );

    const results = (await Promise.allSettled(promises)).flatMap((result) =>
      result.status === 'fulfilled' ? result.value : []
    );

    this.logger.info('Found %d expired records', results.length);
    return results;
  }

  private async queryDynamo(
    date: string,
    shard: number,
    ttlBeforeSeconds: number
  ): Promise<TtlRecordKey[]> {
    const res = await this.dynamoRepository.queryTtlIndex(
      `${date}#${shard}`,
      ttlBeforeSeconds
    );

    return this.getRecordKeysFromQueryOutput(res, ttlBeforeSeconds);
  }

  private getRecordKeysFromQueryOutput(
    queryOutput: QueryCommandOutput,
    ttlBeforeSeconds: number
  ): TtlRecordKey[] | [] {
    if (!queryOutput.Items?.length) {
      return [];
    }

    return queryOutput.Items.flatMap((record) => {
      if (!isTtlRecord(record)) {
        this.logger.error({
          err: 'Record in TTL table does not match schema',
          record,
        });
        return [];
      }

      const { PK, SK, ttl } = record;
      if (ttl >= ttlBeforeSeconds) {
        this.logger.error({
          record,
          ttlBeforeSeconds,
          err: 'TTL of record is after target expiry time',
        });
        return [];
      }

      return { PK, SK };
    });
  }

  private async batchDeleteTtlRecords(
    recordKeys: TtlRecordKey[]
  ): Promise<ProcessingStatistics> {
    const processed = recordKeys.length;
    let deleted = 0;
    let failedToDelete = 0;

    // We do not need to worry about errors if the item has been
    // deleted between getting and deletion - it is an idempotent
    // operation that will not fail unless condition expression
    // is specified
    this.logger.info('Deleting %d records', recordKeys.length);
    const dynamoResponses = chunk(recordKeys, 25).map((batch) =>
      this.limit(async () => {
        const { UnprocessedItems = {} } =
          await this.dynamoRepository.deleteBatch(batch);

        const remainingItems = UnprocessedItems[this.tableName]?.length ?? 0;
        failedToDelete += remainingItems;
        deleted += batch.length - remainingItems;

        if (remainingItems) {
          this.logger.error(
            `Failed to process all delete requests: ${remainingItems} items remaining`
          );
        }
      })
    );

    await Promise.allSettled(dynamoResponses);

    return {
      processed,
      deleted,
      failedToDelete,
    };
  }
}
