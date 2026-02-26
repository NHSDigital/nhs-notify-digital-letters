import { CopyObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Logger } from '../logger';

export type IStorageRepository = {
  publishReport: (
    reportQueryId: string,
    reportFilePath: string,
  ) => Promise<string>;
};

type S3StorageRepositoryDependencies = {
  s3Client: S3Client;
  reportingBucketName: string;
  logger: Logger;
};

export class S3StorageRepository implements IStorageRepository {
  private readonly s3Client: S3Client;

  private readonly reportingBucketName: string;

  private readonly logger: Logger;

  constructor(dependencies: S3StorageRepositoryDependencies) {
    this.s3Client = dependencies.s3Client;
    this.reportingBucketName = dependencies.reportingBucketName;
    this.logger = dependencies.logger;
  }

  async publishReport(reportQueryId: string, reportFilePath: string) {
    this.logger.debug(
      `Publishing report data to ${reportFilePath} for query ${reportQueryId}`,
    );

    const copyObjectCommand = new CopyObjectCommand({
      CopySource: `${this.reportingBucketName}/athena-output/${reportQueryId}.csv`,
      Bucket: this.reportingBucketName,
      Key: reportFilePath,
    });

    await this.s3Client.send(copyObjectCommand);

    this.logger.info(
      `Report stored at ${this.reportingBucketName}/${reportFilePath}.`,
    );

    return `s3://${this.reportingBucketName}/${reportFilePath}`;
  }
}
