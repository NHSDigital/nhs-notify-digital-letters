import { Logger } from 'utils';
import { TtlRepository } from 'infra/ttl-repository';
import { NhsAppStatus, TtlRecord } from 'types/types';

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

  async delete(item: NhsAppStatus): Promise<TtlActionOutcome> {
    let ttlItem: TtlItem;

    try {
      ttlItem = await this.ttlRepository.delete(item.data.messageReference);
    } catch (error) {
      this.logger.warn({
        description: 'Error deleting TTL record',
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
