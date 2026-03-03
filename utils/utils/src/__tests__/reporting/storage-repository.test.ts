import { CopyObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { S3StorageRepository } from '../../reporting/storage-repository';
import { Logger } from '../../logger';

const s3Mock = mockClient(S3Client);

describe('StorageRepository', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as jest.Mocked<Logger>;
  const reportingBucketName = 'test-reporting-bucket';
  let storageRepository: S3StorageRepository;

  beforeEach(() => {
    s3Mock.reset();
    storageRepository = new S3StorageRepository({
      s3Client: new S3Client({}),
      reportingBucketName,
      logger: mockLogger,
    });
  });

  describe('publishReport', () => {
    it('should copy report from athena-output to target path', async () => {
      const reportQueryId = 'query-123';
      const reportFilePath = 'reports/2024/report.csv';

      s3Mock.on(CopyObjectCommand).resolves({});

      const result = await storageRepository.publishReport(
        reportQueryId,
        reportFilePath,
      );

      expect(result).toBe(`s3://${reportingBucketName}/${reportFilePath}`);
      expect(s3Mock.calls()).toHaveLength(1);

      const copyCommand = s3Mock.call(0).args[0].input;
      expect(copyCommand).toEqual({
        CopySource: `${reportingBucketName}/athena-output/${reportQueryId}.csv`,
        Bucket: reportingBucketName,
        Key: reportFilePath,
      });
    });

    it('should throw error when S3 copy fails', async () => {
      const reportQueryId = 'query-456';
      const reportFilePath = 'reports/2024/failed-report.csv';
      const s3Error = new Error('S3 CopyObject failed');

      s3Mock.on(CopyObjectCommand).rejects(s3Error);

      await expect(
        storageRepository.publishReport(reportQueryId, reportFilePath),
      ).rejects.toThrow('S3 CopyObject failed');
    });

    it('should construct correct S3 URIs for nested paths', async () => {
      const reportQueryId = 'query-789';
      const reportFilePath = 'reports/2024/01/daily/report.csv';

      s3Mock.on(CopyObjectCommand).resolves({});

      const result = await storageRepository.publishReport(
        reportQueryId,
        reportFilePath,
      );

      expect(result).toBe(`s3://${reportingBucketName}/${reportFilePath}`);
    });
  });
});
