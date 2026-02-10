import { IReportService, Logger } from 'utils';
import { GenerateReport } from 'digital-letters-events';
import fs from 'node:fs';

export type ReportGeneratorOutcome = 'generated' | 'failed';

export type ReportGeneratorResult = {
  outcome: ReportGeneratorOutcome;
  reportUri?: string;
};

export class ReportGenerator {
  constructor(
    private readonly logger: Logger,
    private readonly reportService: IReportService,
    private readonly reportName: string,
  ) {}

  async generate(event: GenerateReport): Promise<ReportGeneratorResult> {
    try {
      const query = fs.readFileSync('/var/task/queries/report.sql', 'utf8');
      const { senderId } = event.data;
      const { reportDate } = event.data;
      const reportFilePath = `reports/${senderId}/${this.reportName}/${this.reportName}_${senderId}_${reportDate}.csv`;

      this.logger.info(
        `Generating report for sender ${senderId} and date ${reportDate}`,
      );

      const location = await this.reportService.generateReport(
        query,
        [reportDate, senderId],
        reportFilePath,
      );

      return { outcome: 'generated', reportUri: location };
    } catch (error) {
      this.logger.error({
        err: error,
        description: 'Error generating report',
        senderId: event.data.senderId,
        reportDate: event.data.reportDate,
      });
      return { outcome: 'failed' };
    }
  }
}
