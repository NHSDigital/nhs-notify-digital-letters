import { defaultConfigReader } from 'utils';

export type ReportGeneratorConfig = {
  athenaWorkgroup: string;
  athenaDatabase: string;
  eventPublisherEventBusArn: string;
  eventPublisherDlqUrl: string;
  maxPollLimit: number;
  reportingBucket: string;
  reportName: string;
  waitForInSeconds: number;
};

export function loadConfig(): ReportGeneratorConfig {
  return {
    athenaWorkgroup: defaultConfigReader.getValue('ATHENA_WORKGROUP'),
    athenaDatabase: defaultConfigReader.getValue('ATHENA_DATABASE'),
    eventPublisherEventBusArn: defaultConfigReader.getValue(
      'EVENT_PUBLISHER_EVENT_BUS_ARN',
    ),
    eventPublisherDlqUrl: defaultConfigReader.getValue(
      'EVENT_PUBLISHER_DLQ_URL',
    ),
    maxPollLimit: defaultConfigReader.getInt('MAX_POLL_LIMIT'),
    reportingBucket: defaultConfigReader.getValue('REPORTING_BUCKET'),
    reportName: defaultConfigReader.getValue('REPORT_NAME'),
    waitForInSeconds: defaultConfigReader.getInt('WAIT_FOR_IN_SECONDS'),
  };
}
