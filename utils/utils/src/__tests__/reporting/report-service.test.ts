import { Logger } from '../../logger';
import { ReportService } from '../../reporting/report-service';
import { IDataRepository } from '../../reporting/data-repository';
import { IStorageRepository } from '../../reporting/storage-repository';
import { sleep } from '../../util-retry/sleep';

jest.mock('../../util-retry/sleep');

describe('ReportService', () => {
  let mockDataRepository: jest.Mocked<IDataRepository>;
  let mockStorageRepository: jest.Mocked<IStorageRepository>;
  let mockLogger: jest.Mocked<Logger>;
  let reportService: ReportService;

  const defaultMaxPollLimit = 10;
  const defaultWaitForInSeconds = 1;

  beforeEach(() => {
    mockDataRepository = {
      startQuery: jest.fn(),
      getQueryStatus: jest.fn(),
    } as jest.Mocked<IDataRepository>;

    mockStorageRepository = {
      publishReport: jest.fn(),
    } as jest.Mocked<IStorageRepository>;

    mockLogger = {
      child: jest.fn().mockReturnThis(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    reportService = new ReportService(
      mockDataRepository,
      mockStorageRepository,
      defaultMaxPollLimit,
      defaultWaitForInSeconds,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    const query = 'SELECT * FROM test_table';
    const executionParameters = ['param1', 'param2'];
    const reportFilePath = 's3://bucket/report.csv';
    const queryExecutionId = 'test-execution-id-123';

    it('should generate report successfully when query succeeds', async () => {
      mockDataRepository.startQuery.mockResolvedValue(queryExecutionId);
      mockDataRepository.getQueryStatus.mockResolvedValue('SUCCEEDED');
      mockStorageRepository.publishReport.mockResolvedValue(reportFilePath);

      const result = await reportService.generateReport(
        query,
        executionParameters,
        reportFilePath,
      );

      expect(mockDataRepository.startQuery).toHaveBeenCalledWith(
        query,
        executionParameters,
      );
      expect(mockDataRepository.getQueryStatus).toHaveBeenCalledWith(
        queryExecutionId,
      );
      expect(mockStorageRepository.publishReport).toHaveBeenCalledWith(
        queryExecutionId,
        reportFilePath,
      );
      expect(result).toBe(reportFilePath);
      expect(mockLogger.child).toHaveBeenCalledWith({ queryExecutionId });
      expect(mockLogger.info).toHaveBeenCalledWith('Athena query started.');
      expect(mockLogger.info).toHaveBeenCalledWith('Athena query finished.');
    });

    it('should throw error when query fails', async () => {
      mockDataRepository.startQuery.mockResolvedValue(queryExecutionId);
      mockDataRepository.getQueryStatus.mockResolvedValue('FAILED');

      await expect(
        reportService.generateReport(
          query,
          executionParameters,
          reportFilePath,
        ),
      ).rejects.toThrow('Failed to generate report. Query status: FAILED');

      expect(mockStorageRepository.publishReport).not.toHaveBeenCalled();
    });

    it('should throw error when query is cancelled', async () => {
      mockDataRepository.startQuery.mockResolvedValue(queryExecutionId);
      mockDataRepository.getQueryStatus.mockResolvedValue('CANCELLED');

      await expect(
        reportService.generateReport(
          query,
          executionParameters,
          reportFilePath,
        ),
      ).rejects.toThrow('Failed to generate report. Query status: CANCELLED');
    });

    it('should poll until query succeeds', async () => {
      mockDataRepository.startQuery.mockResolvedValue(queryExecutionId);
      mockDataRepository.getQueryStatus
        .mockResolvedValueOnce('QUEUED')
        .mockResolvedValueOnce('RUNNING')
        .mockResolvedValueOnce('RUNNING')
        .mockResolvedValueOnce('SUCCEEDED');
      mockStorageRepository.publishReport.mockResolvedValue(reportFilePath);

      await reportService.generateReport(
        query,
        executionParameters,
        reportFilePath,
      );

      expect(mockDataRepository.getQueryStatus).toHaveBeenCalledTimes(4);
      expect(sleep).toHaveBeenCalledTimes(4);
      expect(sleep).toHaveBeenCalledWith(defaultWaitForInSeconds);
    });

    it('should throw error when max poll limit is reached', async () => {
      const shortPollLimit = 3;
      const shortReportService = new ReportService(
        mockDataRepository,
        mockStorageRepository,
        shortPollLimit,
        defaultWaitForInSeconds,
        mockLogger,
      );

      mockDataRepository.startQuery.mockResolvedValue(queryExecutionId);
      mockDataRepository.getQueryStatus.mockResolvedValue('RUNNING');

      await expect(
        shortReportService.generateReport(
          query,
          executionParameters,
          reportFilePath,
        ),
      ).rejects.toThrow('Failed to generate report. Query status: RUNNING');

      expect(mockDataRepository.getQueryStatus).toHaveBeenCalledTimes(
        shortPollLimit,
      );
    });

    it('should handle UNKNOWN status and continue polling', async () => {
      mockDataRepository.startQuery.mockResolvedValue(queryExecutionId);
      mockDataRepository.getQueryStatus
        .mockResolvedValueOnce('QUEUED')
        .mockResolvedValueOnce('UNKNOWN')
        .mockResolvedValueOnce('SUCCEEDED');
      mockStorageRepository.publishReport.mockResolvedValue(reportFilePath);

      await reportService.generateReport(
        query,
        executionParameters,
        reportFilePath,
      );

      expect(mockDataRepository.getQueryStatus).toHaveBeenCalledTimes(3);
    });

    it('should respect custom wait time between polls', async () => {
      const customWaitTime = 5;
      const customReportService = new ReportService(
        mockDataRepository,
        mockStorageRepository,
        defaultMaxPollLimit,
        customWaitTime,
        mockLogger,
      );

      mockDataRepository.startQuery.mockResolvedValue(queryExecutionId);
      mockDataRepository.getQueryStatus
        .mockResolvedValueOnce('RUNNING')
        .mockResolvedValueOnce('SUCCEEDED');
      mockStorageRepository.publishReport.mockResolvedValue(reportFilePath);

      await customReportService.generateReport(
        query,
        executionParameters,
        reportFilePath,
      );

      expect(sleep).toHaveBeenCalledWith(customWaitTime);
    });

    it('should throw an error if the query is not started successfully', async () => {
      // eslint-disable-next-line unicorn/no-useless-undefined -- We want to explicitly set the return value.
      mockDataRepository.startQuery.mockResolvedValue(undefined);

      await expect(
        reportService.generateReport(
          query,
          executionParameters,
          reportFilePath,
        ),
      ).rejects.toThrow('failed to obtain a query executionId from Athena');
    });

    it('should continue polling if getQueryStatus returns undefined', async () => {
      mockDataRepository.startQuery.mockResolvedValue(queryExecutionId);
      mockDataRepository.getQueryStatus
        // eslint-disable-next-line unicorn/no-useless-undefined -- We want to explicitly set the return value.
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce('SUCCEEDED');
      mockStorageRepository.publishReport.mockResolvedValue(reportFilePath);

      await reportService.generateReport(
        query,
        executionParameters,
        reportFilePath,
      );

      expect(mockDataRepository.getQueryStatus).toHaveBeenCalledTimes(2);
    });
  });
});
