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

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      for (const event of parsedEvents) {
        expect(event.type).toBe(
          'uk.nhs.notify.digital.letters.reporting.generate.report.v1',
        );
        expect(event.data).toBeDefined();
        expect(event.data.senderId).toBeDefined();
        expect(event.data.reportDate).toBe(yesterdayString);
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
