import { expect, test } from '@playwright/test';
import {
  EVENT_BUS_LOG_GROUP_NAME,
  REPORT_SCHEDULER_LAMBDA_NAME,
} from 'constants/backend-constants';
import { getLogsFromCloudwatch } from 'helpers/cloudwatch-helpers';
import expectToPassEventually from 'helpers/expectations';
import { invokeLambda } from 'helpers/lambda-helpers';

function yesterdayDateRange() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayStart = new Date(yesterday.setUTCHours(0, 0, 0, 0));
  const yesterdayEnd = new Date(yesterday.setUTCHours(23, 59, 59, 999));

  return {
    yesterdayStart: yesterdayStart.toISOString(),
    yesterdayEnd: yesterdayEnd.toISOString(),
  };
}

test.describe('Digital Letters - Report Scheduler', () => {
  test('should send reporting.generate.report for all senders', async () => {
    invokeLambda(REPORT_SCHEDULER_LAMBDA_NAME);

    await expectToPassEventually(async () => {
      const eventLogEntries = await getLogsFromCloudwatch(
        EVENT_BUS_LOG_GROUP_NAME,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.reporting.generate.report.v1"',
        ],
      );

      const parsedEvents = eventLogEntries.map((entry: any) =>
        JSON.parse(entry.details.event_detail),
      );

      const { yesterdayEnd, yesterdayStart } = yesterdayDateRange();

      for (const event of parsedEvents) {
        expect(event.type).toBe(
          'uk.nhs.notify.digital.letters.reporting.generate.report.v1',
        );
        expect(event.data).toBeDefined();
        expect(event.data.senderId).toBeDefined();
        expect(event.data.reportPeriodStartTime).toBe(yesterdayStart);
        expect(event.data.reportPeriodEndTime).toBe(yesterdayEnd);
      }

      const senderIds = parsedEvents.map((event) => event.data.senderId);
      expect(senderIds).toContain('2b8ebb33-8b33-49bd-949e-c12e22d25320');
      expect(senderIds).toContain('f017669b-6da4-4576-9d59-3d2b7f005ae2');
      expect(senderIds).toContain('67403568-166e-41d0-900a-1f31fe93a091');
    }, 120);
  });
});
