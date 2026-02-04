import { expect, test } from '@playwright/test';
import {
  EVENT_BUS_LOG_GROUP_NAME,
  REPORT_SCHEDULER_LAMBDA_NAME,
} from 'constants/backend-constants';
import {
  SENDER_ID_SKIPS_NOTIFY,
  SENDER_ID_THAT_TRIGGERS_ERROR_IN_NOTIFY_SANDBOX,
  SENDER_ID_VALID_FOR_NOTIFY_SANDBOX,
} from 'constants/tests-constants';
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
      expect(senderIds).toContain(SENDER_ID_VALID_FOR_NOTIFY_SANDBOX);
      expect(senderIds).toContain(
        SENDER_ID_THAT_TRIGGERS_ERROR_IN_NOTIFY_SANDBOX,
      );
      expect(senderIds).toContain(SENDER_ID_SKIPS_NOTIFY);
    }, 120);
  });
});
