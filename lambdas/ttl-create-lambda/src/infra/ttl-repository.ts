import { PutCommand, PutCommandOutput } from '@aws-sdk/lib-dynamodb';
import { Logger, TtlItemEvent } from 'utils';

interface IDynamoCaller {
  send: (updateCommand: PutCommand) => Promise<PutCommandOutput>;
}

export class TtlRepository {
  private readonly ttlWaitTimeSeconds;

  constructor(
    private readonly tableName: string,
    ttlWaitTimeHours: number,
    private readonly logger: Logger,
    private readonly dynamoClient: IDynamoCaller,
    private readonly shardCount: number,
  ) {
    this.ttlWaitTimeSeconds = ttlWaitTimeHours * 60 * 60;
  }

  public async insertTtlRecord(item: TtlItemEvent) {
    const ttlTime = Math.round(Date.now() / 1000) + this.ttlWaitTimeSeconds;

    this.logger.info({
      description: 'Inserting item into TTL table',
      PK: item.data.messageUri,
      ttlTime,
    });

    try {
      await this.putTtlRecord(item, ttlTime);
    } catch (error) {
      this.logger.error({
        description: 'Failed to insert TTL record into DynamoDB',
        err: error,
      });
      throw error;
    }
  }

  private async putTtlRecord(ttlItemEvent: TtlItemEvent, ttlTime: number) {
    // GSI PK utilising write sharding YYYY-MM-DD#<RANDOM_INT_BETWEEN_0_AND_[shardCount]>
    const ttlGsiPk = `${
      new Date(ttlTime * 1000).toISOString().split('T')[0]
      // eslint-disable-next-line sonarjs/pseudo-random
    }#${Math.floor(Math.random() * this.shardCount)}`;
    await this.dynamoClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: ttlItemEvent.data.messageUri,
          SK: 'TTL',
          ttl: ttlTime,
          dateOfExpiry: ttlGsiPk,
          event: ttlItemEvent,
        },
      }),
    );
  }
}

export default TtlRepository;
