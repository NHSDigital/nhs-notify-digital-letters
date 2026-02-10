import { CopyObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Logger } from '../logger';

export type IStorageRepository = {
  publishReport: (
    reportQueryId: string,
    reportFilePath: string,
  ) => Promise<string>;
};

type StorageRepositoryDependencies = {
  s3Client: S3Client;
  reportingBucketName: string;
  logger: Logger;
};

export const createStorageRepository = ({
  logger,
  reportingBucketName,
  s3Client,
}: StorageRepositoryDependencies): IStorageRepository => ({
  async publishReport(reportQueryId: string, reportFilePath: string) {
    logger.debug(
      `Publishing report data to ${reportFilePath} for query ${reportQueryId}`,
    );

    const copyObjectCommand = new CopyObjectCommand({
      CopySource: `${reportingBucketName}/athena-output/${reportQueryId}.csv`,
      Bucket: reportingBucketName,
      Key: reportFilePath,
    });

    await s3Client.send(copyObjectCommand);

    logger.info(`Report stored at ${reportingBucketName}/${reportFilePath}.`);

    return `s3://${reportingBucketName}/${reportFilePath}`;
  },
});
