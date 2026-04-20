import { Logger } from 'utils';
import { TtlRepository } from 'infra/ttl-repository';
import { ChannelStatusPublishedEvent, TtlRecord } from 'types/types';

export type TtlItem = TtlRecord | undefined;

export type TtlActionOutcome = {
  result: 'success' | 'failed';
  ttlItem?: TtlItem;
};

export class TtlActions {
  constructor(
    private readonly ttlRepository: TtlRepository,
    private readonly logger: Logger,
  ) {}

  async markWithdrawn(
    item: ChannelStatusPublishedEvent,
  ): Promise<TtlActionOutcome> {
    let ttlItem: TtlItem;

    try {
      ttlItem = await this.ttlRepository.markWithdrawn(
        item.data.messageReference,
      );
    } catch (error) {
      this.logger.warn({
        description: 'Error marking TTL withdrawn',
        err: error,
      });

      return { result: 'failed' };
    }

    if (!ttlItem) {
      this.logger.info({
        description: 'TTL record not found',
        messageReference: item.data.messageReference,
      });
    }

    return { result: 'success', ttlItem };
  }
}
