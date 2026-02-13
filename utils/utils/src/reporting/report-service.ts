import type { Logger } from '../logger';
import { sleep } from '../util-retry/sleep';
import { IDataRepository } from './data-repository';
import { IStorageRepository } from './storage-repository';

export interface IReportService {
  generateReport(
    query: string,
    executionParameters: string[],
    reportFilePath: string,
  ): Promise<string>;
}

export class ReportService implements IReportService {
  readonly dataRepository: IDataRepository;

  readonly storageRepository: IStorageRepository;

  readonly maxPollLimit: number;

  readonly waitForInSeconds: number;

  readonly logger: Logger;

  constructor(
    dataRepository: IDataRepository,
    storageRepository: IStorageRepository,
    maxPollLimit: number,
    waitForInSeconds: number,
    logger: Logger,
  ) {
    this.dataRepository = dataRepository;
    this.storageRepository = storageRepository;
    this.maxPollLimit = maxPollLimit;
    this.waitForInSeconds = waitForInSeconds;
    this.logger = logger;
  }

  async generateReport(
    query: string,
    executionParameters: string[],
    reportFilePath: string,
  ): Promise<string> {
    const queryExecutionId = await this.dataRepository.startQuery(
      query,
      executionParameters,
    );

    if (!queryExecutionId) {
      throw new Error('failed to obtain a query executionId from Athena');
    }

    const logger = this.logger.child({ queryExecutionId });

    logger.info('Athena query started.');

    const status = await this.poll(
      queryExecutionId,
      this.maxPollLimit,
      this.waitForInSeconds,
    );

    if (status !== 'SUCCEEDED') {
      throw new Error(`Failed to generate report. Query status: ${status}`);
    }

    logger.info('Athena query finished.');

    return this.storageRepository.publishReport(
      queryExecutionId,
      reportFilePath,
    );
  }

  private async poll(
    queryId: string,
    maxPollLimit: number,
    waitForInSeconds: number,
  ) {
    let count = 0;
    let status = 'QUEUED';

    while (
      count < maxPollLimit &&
      ['QUEUED', 'RUNNING', 'UNKNOWN'].includes(status)
    ) {
      status = (await this.dataRepository.getQueryStatus(queryId)) || 'UNKNOWN';

      count += 1;

      await sleep(waitForInSeconds);
    }

    return status;
  }
}
