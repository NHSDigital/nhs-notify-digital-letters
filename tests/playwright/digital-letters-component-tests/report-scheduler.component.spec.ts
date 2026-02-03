import { expect, test } from '@playwright/test';
import {
  EVENT_BUS_LOG_GROUP_NAME,
  REPORT_SCHEDULER_LAMBDA_NAME,
} from 'constants/backend-constants';
import { getLogsFromCloudwatch } from 'helpers/cloudwatch-helpers';
import expectToPassEventually from 'helpers/expectations';
import { invokeLambda } from 'helpers/lambda-helpers';

test.describe('Digital Letters - Report Scheduler', () => {
  test('should send reporting.generate.report for all senders', async () => {
    invokeLambda(REPORT_SCHEDULER_LAMBDA_NAME);

    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        EVENT_BUS_LOG_GROUP_NAME,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.reporting.generate.report.v1"',
        ],
      );

      expect(eventLogEntry.length).toEqual(3);
    }, 120);
  });
});
