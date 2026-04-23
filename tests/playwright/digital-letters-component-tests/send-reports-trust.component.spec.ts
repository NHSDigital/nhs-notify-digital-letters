import { expect, test } from '@playwright/test';
import {
  ENV,
  NON_PII_S3_BUCKET_NAME,
  REPORTING_S3_BUCKET_NAME,
  REPORT_SENDER_DLQ_NAME,
} from 'constants/backend-constants';
import eventPublisher from 'helpers/event-bus-helpers';
import { expectEventOnTestObserverQueue } from 'helpers/test-observer-helpers';
import expectToPassEventually from 'helpers/expectations';
import { downloadFromS3, uploadToS3 } from 'helpers/s3-helpers';
import { expectMessageContainingString } from 'helpers/sqs-helpers';
import { v4 as uuidv4 } from 'uuid';
import { SENDER_ID_SKIPS_NOTIFY } from 'constants/tests-constants';
import { validateReportGenerated } from 'digital-letters-events';

test.describe('Digital Letters - Send reports to Trust', () => {
  const senderId = SENDER_ID_SKIPS_NOTIFY;
  const trustMeshMailboxReportsId = 'test-mesh-reports-1';
  const messageContent = 'Sample content';

  async function publishReportGeneratedEvent(reportKey: string): Promise<void> {
    await eventPublisher.sendEvents(
      [
        {
          id: uuidv4(),
          specversion: '1.0',
          plane: 'data',
          dataschemaversion: '1.0.0',
          source:
            '/nhs/england/notify/development/dev-12345/digitalletters/reporting',
          subject: `report/${uuidv4()}`,
          type: 'uk.nhs.notify.digital.letters.reporting.report.generated.v1',
          time: new Date().toISOString(),
          recordedtime: new Date().toISOString(),
          datacontenttype: 'application/json',
          severitynumber: 2,
          severitytext: 'INFO',
          traceparent:
            '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-reporting-report-generated-data.schema.json',
          data: {
            reportUri: `s3://${REPORTING_S3_BUCKET_NAME}/${reportKey}`,
            senderId,
          },
        },
      ],
      validateReportGenerated,
    );
  }

  async function expectReportSentEventAndMeshMessageSent(
    meshMailboxReportsId: string,
  ): Promise<void> {
    const detail = await expectEventOnTestObserverQueue(
      'uk.nhs.notify.digital.letters.reporting.report.sent.v1',
      (d) =>
        (d.data as any)?.meshMailboxReportsId === meshMailboxReportsId &&
        (d.data as any)?.senderId === senderId,
      120_000,
    );

    const { sentMeshMessageId } = detail.data as any;
    expect(sentMeshMessageId).toBeTruthy();
    //  Mock MESH uses NON_PII_S3_BUCKET_NAME bucket, the object key is the sentMeshMessageId.
    const storedMessage = await downloadFromS3(
      NON_PII_S3_BUCKET_NAME,
      `mock-mesh/mock-mailbox/out/${trustMeshMailboxReportsId}/${sentMeshMessageId}`,
    );

    expect(storedMessage.body).toContain(messageContent);
  }

  test('should send a ReportSent event following a successful reportGenerated event', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    const reportForDate = yesterdayString;
    const fileName = `${Date.now()}_TEST_${uuidv4().slice(0, 8)}_${reportForDate}.csv`;
    const reportKey = `${ENV}/${fileName}`;

    await uploadToS3(messageContent, REPORTING_S3_BUCKET_NAME, reportKey);
    await publishReportGeneratedEvent(reportKey);

    await expectReportSentEventAndMeshMessageSent(trustMeshMailboxReportsId);
  });

  test('should send message to report-sender DLQ when file does not exists', async () => {
    test.setTimeout(160_000);

    const missingReportFileName = 'report-does-not-exist.csv';

    await publishReportGeneratedEvent(missingReportFileName);

    await expectMessageContainingString(
      REPORT_SENDER_DLQ_NAME,
      missingReportFileName,
      150,
    );
  });
});
