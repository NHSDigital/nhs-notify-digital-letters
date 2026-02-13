import { expect, test } from '@playwright/test';
import {
  ATHENA_WORKGROUP_NAME,
  ENV,
  GLUE_DATABASE_NAME,
  GLUE_TABLE_NAME,
  REPORTING_S3_BUCKET_NAME,
  REPORTING_S3_FIREHOSE_OUTPUT_KEY_PREFIX,
} from 'constants/backend-constants';
import {
  GenerateReport,
  ItemRemoved,
  MESHInboxMessageDownloaded,
} from 'digital-letters-events';
import generateReportValidator from 'digital-letters-events/GenerateReport.js';
import itemRemovedValidator from 'digital-letters-events/ItemRemoved.js';
import messageDownloadedValidator from 'digital-letters-events/MESHInboxMessageDownloaded.js';
import {
  QueryExecutionState,
  getQueryState,
  triggerTableMetadataRefresh,
} from 'helpers/athena-helpers';
import { getLogsFromCloudwatch } from 'helpers/cloudwatch-helpers';
import eventPublisher from 'helpers/event-bus-helpers';
import expectToPassEventually from 'helpers/expectations';
import { downloadFromS3, existsInS3 } from 'helpers/s3-helpers';
import { v4 as uuidv4 } from 'uuid';
import { parse } from 'csv-parse/sync';

test.describe('Digital Letters - Report Generator', () => {
  test.only('should generate a report containing the expected statuses', async () => {
    // We need to wait for events to make their way from EventBridge -> Firehose -> S3 -> Glue
    test.setTimeout(700_000);

    // Use a random sender ID, so we can be sure that if there are files with this prefix
    // in S3 they've been created by this test.
    const senderId = `report-generator-test-${uuidv4()}`;
    console.log(`Using senderId: ${senderId}`);

    // Communication type should be Digital, and the status should be Read
    const itemRemovedEventId = uuidv4();
    const itemRemovedEventTime = new Date().toISOString();
    await eventPublisher.sendEvents<ItemRemoved>(
      [
        {
          id: itemRemovedEventId,
          specversion: '1.0',
          source:
            '/nhs/england/notify/production/primary/data-plane/digitalletters/queue',
          subject:
            'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
          type: 'uk.nhs.notify.digital.letters.queue.item.removed.v1',
          time: itemRemovedEventTime,
          recordedtime: itemRemovedEventTime,
          severitynumber: 2,
          traceparent:
            '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
          datacontenttype: 'application/json',
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-queue-item-removed-data.schema.json',
          severitytext: 'INFO',
          data: {
            messageReference: 'component-test-itemRemoved',
            senderId,
            messageUri: `https://example.com/ttl/resource/${itemRemovedEventId}`,
          },
        },
      ],
      itemRemovedValidator,
    );

    // TODO: Send a ItemDequeued event - communication type should be Digital, and the status should be Unread
    // TODO: Send a PrintLetterTransitioned event, with status REJECTED - communication type should be Print, and the status should be Rejected
    // TODO: Send a PrintLetterTransitioned event, with status DISPATCHED - communication type should be Print, and the status should be Dispatched
    // TODO: Send a PrintLetterTransitioned event, with status FAILED - communication type should be Print, and the status should be Failed
    // TODO: Send a PrintLetterTransitioned event, with status RETURNED - communication type should be Print, and the status should be Returned

    // Send a MESHInboxMessageDownloaded event (to prove it isn't included in the report)
    const downloadedEventId = uuidv4();
    const downloadedEventTime = new Date().toISOString();
    await eventPublisher.sendEvents<MESHInboxMessageDownloaded>(
      [
        {
          id: downloadedEventId,
          specversion: '1.0',
          source:
            '/nhs/england/notify/production/primary/data-plane/digitalletters/mesh',
          subject:
            'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
          type: 'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1',
          time: downloadedEventTime,
          recordedtime: downloadedEventTime,
          severitynumber: 2,
          traceparent:
            '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
          datacontenttype: 'application/json',
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-mesh-inbox-message-downloaded-data.schema.json',
          severitytext: 'INFO',
          data: {
            meshMessageId: '12345',
            messageUri: `https://example.com/ttl/resource/${downloadedEventId}`,
            messageReference: 'component-test-messageDownloaded',
            senderId,
          },
        },
      ],
      messageDownloadedValidator,
    );

    await expectToPassEventually(
      async () => {
        console.log(
          'Checking for events in S3 with prefix:',
          `${REPORTING_S3_FIREHOSE_OUTPUT_KEY_PREFIX}/senderid=${senderId}`,
        );
        const eventsHaveBeenWrittenToS3 = await existsInS3(
          REPORTING_S3_BUCKET_NAME,
          `${REPORTING_S3_FIREHOSE_OUTPUT_KEY_PREFIX}/senderid=${senderId}`,
        );

        expect(eventsHaveBeenWrittenToS3).toBeTruthy();
      },
      300_000,
      10,
    );

    // Trigger a metadata refresh for the Glue table, which will cause it to pick up any new files in S3
    const refreshQueryExecutionId = await triggerTableMetadataRefresh(
      GLUE_DATABASE_NAME,
      GLUE_TABLE_NAME,
      ATHENA_WORKGROUP_NAME,
    );

    await expectToPassEventually(async () => {
      console.log(
        'Waiting for Glue table metadata refresh to complete, query execution ID:',
        refreshQueryExecutionId,
      );
      const refreshQueryState = await getQueryState(refreshQueryExecutionId);

      expect(refreshQueryState).toEqual(QueryExecutionState.SUCCEEDED);
    });

    const generateReportEventId = uuidv4();
    const generateReportEventTime = new Date().toISOString();
    const reportDate = new Date().toISOString().split('T')[0];
    await eventPublisher.sendEvents<GenerateReport>(
      [
        {
          id: generateReportEventId,
          specversion: '1.0',
          source:
            '/nhs/england/notify/production/primary/data-plane/digitalletters/reporting',
          subject:
            'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
          type: 'uk.nhs.notify.digital.letters.reporting.generate.report.v1',
          time: generateReportEventTime,
          recordedtime: generateReportEventTime,
          severitynumber: 2,
          traceparent:
            '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
          datacontenttype: 'application/json',
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-reporting-generate-report-data.schema.json',
          severitytext: 'INFO',
          data: {
            senderId,
            reportDate,
          },
        },
      ],
      generateReportValidator,
    );

    const reportKey = `transactional-reports/${senderId}/completed_communications/completed_communications_${reportDate}.csv`;

    await expectToPassEventually(
      async () => {
        console.log(`Looking for report with prefix: ${reportKey}`);

        const reportHasBeenWrittenToS3 = await existsInS3(
          REPORTING_S3_BUCKET_NAME,
          reportKey,
        );

        expect(reportHasBeenWrittenToS3).toBeTruthy();
      },
      300_000,
      10,
    );

    const report = await downloadFromS3(REPORTING_S3_BUCKET_NAME, reportKey);

    console.log('Received report:', report.body);

    const reportRows = parse(report.body, { columns: true });
    expect(reportRows).toEqual([
      {
        'Message Reference': 'component-test-itemRemoved',
        Time: itemRemovedEventTime,
        'Communication Type': 'Digital',
        Status: 'Read',
      },
    ]);

    // Verify ReportGenerated event published
    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        `/aws/vendedlogs/events/event-bus/nhs-${ENV}-dl`,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.reporting.report.generated.v1"',
          `$.details.event_detail = "*\\"senderId\\":\\"${senderId}\\"*"`,
        ],
      );

      expect(eventLogEntry.length).toEqual(1);
    });
  });

  // TODO: Add a test that proves the priority of events is applied as expected?
});
