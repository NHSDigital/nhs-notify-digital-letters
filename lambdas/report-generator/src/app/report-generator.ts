import { IReportService, Logger } from 'utils';
import { GenerateReport } from 'digital-letters-events';
import fs from 'node:fs';

export type ReportGeneratorOutcome = 'generated' | 'failed';

export type ReportGeneratorResult =
  | {
      outcome: 'generated';
      reportUri: string;
    }
  | {
      outcome: 'failed';
    };

export class ReportGenerator {
  constructor(
    private readonly logger: Logger,
    private readonly reportService: IReportService,
    private readonly reportName: string,
  ) {}

  async generate(event: GenerateReport): Promise<ReportGeneratorResult> {
    const { reportDate, senderId } = event.data;

    try {
      const query = fs.readFileSync('/var/task/queries/report.sql', 'utf8');
      const reportFilePath = `transactional-reports/${senderId}/${this.reportName}/${this.reportName}_${reportDate}.csv`;

      this.logger.info(
        `Generating report for sender ${senderId} and date ${reportDate}`,
      );

      const location = await this.reportService.generateReport(
        query,
        [`'${reportDate}'`, `'${senderId}'`],
        reportFilePath,
      );

      return { outcome: 'generated', reportUri: location };
    } catch (error) {
      this.logger.error({
        err: error,
        description: 'Error generating report',
        senderId,
        reportDate,
      });
      return { outcome: 'failed' };
    }
  }
}
