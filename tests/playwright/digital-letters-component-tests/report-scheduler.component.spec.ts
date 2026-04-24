import { expect, test } from '@playwright/test';
import { REPORT_SCHEDULER_LAMBDA_NAME } from 'constants/backend-constants';
import {
  SENDER_ID_SKIPS_NOTIFY,
  SENDER_ID_THAT_TRIGGERS_ERROR_IN_NOTIFY_SANDBOX,
  SENDER_ID_VALID_FOR_NOTIFY_SANDBOX,
} from 'constants/tests-constants';
import { invokeLambda } from 'helpers/lambda-helpers';
import {
  REPORTING_OBSERVER_QUEUE_URL,
  expectEventOnTestObserverQueue,
} from 'helpers/test-observer-helpers';

test.describe('Digital Letters - Report Scheduler', () => {
  test('should send reporting.generate.report for all senders', async () => {
    test.setTimeout(120_000);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    invokeLambda(REPORT_SCHEDULER_LAMBDA_NAME);

    for (const senderId of [
      SENDER_ID_VALID_FOR_NOTIFY_SANDBOX,
      SENDER_ID_THAT_TRIGGERS_ERROR_IN_NOTIFY_SANDBOX,
      SENDER_ID_SKIPS_NOTIFY,
    ]) {
      const detail = await expectEventOnTestObserverQueue(
        REPORTING_OBSERVER_QUEUE_URL,
        'uk.nhs.notify.digital.letters.reporting.generate.report.v1',
        (d) => (d as any).data.senderId === senderId,
        80_000,
      );
      expect((detail as any).data.reportDate).toBe(yesterdayString);
    }
  });
});
