import { IReportService, Logger } from 'utils';
import { GenerateReport } from 'digital-letters-events';
import fs from 'node:fs';
import { ReportGenerator } from 'app/report-generator';

jest.mock('node:fs');

describe('ReportGenerator', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockReportService: jest.Mocked<IReportService>;
  let reportGenerator: ReportGenerator;
  const reportName = 'completed_communications';

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    mockReportService = {
      generateReport: jest.fn(),
    } as jest.Mocked<IReportService>;

    reportGenerator = new ReportGenerator(
      mockLogger,
      mockReportService,
      reportName,
    );

    jest.clearAllMocks();
  });

  describe('generate', () => {
    const mockEvent: GenerateReport = {
      data: {
        senderId: 'sender-123',
        reportDate: '2025-01-15',
      },
      specversion: '1.0',
      type: 'uk.nhs.notify.digital.letters.reporting.generate.report.v1',
      source: 'test',
      id: 'test-id',
      time: '2025-01-15T10:00:00Z',
      datacontenttype: 'application/json',
      subject: 'customer/5661de82-7453-44a1-9922-e0c98e5411c1',
      traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
      recordedtime: '2025-12-15T10:00:00Z',
      severitynumber: 2,
    };

    const mockQuery =
      'SELECT * FROM reports WHERE date = $1 AND sender_id = $2';

    beforeEach(() => {
      (fs.readFileSync as jest.Mock).mockReturnValue(mockQuery);
    });

    it('should successfully generate a report', async () => {
      const expectedLocation =
        's3://bucket/reports/sender-123/completed_communications/completed_communications_sender-123_2025-01-15.csv';
      mockReportService.generateReport.mockResolvedValue(expectedLocation);

      const result = await reportGenerator.generate(mockEvent);

      expect(fs.readFileSync).toHaveBeenCalledWith(
        '/var/task/queries/report.sql',
        'utf8',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Generating report for sender sender-123 and date 2025-01-15',
      );
      expect(mockReportService.generateReport).toHaveBeenCalledWith(
        mockQuery,
        ['2025-01-15', 'sender-123'],
        'transactional-reports/sender-123/completed_communications/completed_communications_2025-01-15.csv',
      );
      expect(result).toEqual({
        outcome: 'generated',
        reportUri: expectedLocation,
      });
    });

    it('should construct correct report file path with report name', async () => {
      const expectedLocation =
        's3://bucket/transactional-reports/sender-123/completed_communications/completed_communications_2025-01-15.csv';
      mockReportService.generateReport.mockResolvedValue(expectedLocation);

      const customEvent: GenerateReport = {
        ...mockEvent,
        data: {
          senderId: 'sender-456',
          reportDate: '2025-02-20',
        },
      };

      await reportGenerator.generate(customEvent);

      expect(mockReportService.generateReport).toHaveBeenCalledWith(
        expect.any(String),
        ['2025-02-20', 'sender-456'],
        'transactional-reports/sender-456/completed_communications/completed_communications_2025-02-20.csv',
      );
    });

    it('should pass query parameters in correct order', async () => {
      mockReportService.generateReport.mockResolvedValue(
        's3://bucket/report.csv',
      );

      await reportGenerator.generate(mockEvent);

      expect(mockReportService.generateReport).toHaveBeenCalledWith(
        mockQuery,
        ['2025-01-15', 'sender-123'],
        expect.any(String),
      );
    });

    it('should return failed outcome when report service throws error', async () => {
      const error = new Error('Database connection failed');
      mockReportService.generateReport.mockRejectedValue(error);

      const result = await reportGenerator.generate(mockEvent);

      expect(mockLogger.error).toHaveBeenCalledWith({
        err: error,
        description: 'Error generating report',
        senderId: 'sender-123',
        reportDate: '2025-01-15',
      });
      expect(result).toEqual({
        outcome: 'failed',
      });
    });

    it('should return failed outcome when file read throws error', async () => {
      const error = new Error('File not found');
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const result = await reportGenerator.generate(mockEvent);

      expect(mockLogger.error).toHaveBeenCalledWith({
        err: error,
        description: 'Error generating report',
        senderId: 'sender-123',
        reportDate: '2025-01-15',
      });
      expect(result).toEqual({
        outcome: 'failed',
      });
    });

    it('should not return reportUri when report generation fails', async () => {
      mockReportService.generateReport.mockRejectedValue(
        new Error('S3 upload failed'),
      );

      const result = await reportGenerator.generate(mockEvent);

      expect(result.reportUri).toBeUndefined();
      expect(result.outcome).toBe('failed');
    });
  });
});
