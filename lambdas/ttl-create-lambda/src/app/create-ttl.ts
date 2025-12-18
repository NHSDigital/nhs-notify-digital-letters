import { Logger, TtlItemEvent } from 'utils';
import { TtlRepository } from 'infra/ttl-repository';

export type CreateTtlOutcome = 'sent' | 'failed';

export class CreateTtl {
  constructor(
    private readonly ttlDatabaseRepository: TtlRepository,
    private readonly logger: Logger,
  ) {}

  async send(item: TtlItemEvent): Promise<CreateTtlOutcome> {
    try {
      await this.ttlDatabaseRepository.insertTtlRecord(item);
    } catch (error) {
      this.logger.error({
        description: 'Error inserting request TTL record',
        err: error,
      });

      return 'failed';
    }

    return 'sent';
  }
}
