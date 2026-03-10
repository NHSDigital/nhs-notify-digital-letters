import { IReportService, Logger } from 'utils';
import { GenerateReport } from 'digital-letters-events';

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
    private readonly athenaNamedQueryId: string,
  ) {}

  async generate(event: GenerateReport): Promise<ReportGeneratorResult> {
    const { reportDate, senderId } = event.data;

    try {
      const reportFilePath = `event-reports/${senderId}/${this.reportName}/${this.reportName}_${reportDate}.csv`;

      this.logger.info({
        description: 'Generating report',
        senderId,
        reportDate,
        athenaNamedQueryId: this.athenaNamedQueryId,
        reportFilePath,
      });

      const location = await this.reportService.generateReport(
        this.athenaNamedQueryId,
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
