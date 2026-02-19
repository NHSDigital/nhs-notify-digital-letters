import { expect, test } from '@playwright/test';
import { REPORTING_S3_BUCKET_NAME } from 'constants/backend-constants';

import {
  CommunicationType,
  EventStatus,
  ReportScenario,
  assertReportGeneratedEventIsPublished,
  assertReportIsPublishedInReportingBucket,
  prerequisiteAssertFirehoseEventsInS3,
  prerequisiteTriggerAndAssertGlueTableRefresh,
  publishEventForScenario,
  publishEventNotInReports,
  publishGenerateReport,
} from 'helpers/report-helpers';

import { downloadFromS3 } from 'helpers/s3-helpers';
import { v4 as uuidv4 } from 'uuid';
import { parse } from 'csv-parse/sync';

const senderId = `report-generator-test-${uuidv4()}`;
const unknownSenderId = `unknown-sender-${uuidv4()}`;

const scenarios = [
  new ReportScenario(
    'component-test-itemRemoved',
    CommunicationType.Digital,
    [EventStatus.Read],
    'Read',
    senderId,
  ),
  new ReportScenario(
    'component-test-itemDequeued',
    CommunicationType.Digital,
    [EventStatus.Unread],
    'Unread',
    senderId,
  ),
  // Scenarios for communication type Print where there is a single event per message reference.
  new ReportScenario(
    'component-test-rejected',
    CommunicationType.Print,
    [EventStatus.Rejected],
    'Rejected',
    senderId,
  ),
  new ReportScenario(
    'component-test-failed',
    CommunicationType.Print,
    [EventStatus.Failed],
    'Failed',
    senderId,
  ),
  new ReportScenario(
    'component-test-returned',
    CommunicationType.Print,
    [EventStatus.Returned],
    'Returned',
    senderId,
  ),
  new ReportScenario(
    'component-test-dispatched',
    CommunicationType.Print,
    [EventStatus.Dispatched],
    'Dispatched',
    senderId,
  ),
  // multiple events for the same message reference, should take the one with highest priority status (returned > failed > dispatched > rejected)
  new ReportScenario(
    'component-test-rejected-pending',
    CommunicationType.Print,
    [EventStatus.Rejected, EventStatus.Pending],
    'Rejected',
    senderId,
  ), // pending is ignored.
  new ReportScenario(
    'component-test-rejected-dispatched',
    CommunicationType.Print,
    [EventStatus.Rejected, EventStatus.Dispatched],
    'Dispatched',
    senderId,
  ),
  new ReportScenario(
    'component-test-rejected-dispatched-failed',
    CommunicationType.Print,
    [EventStatus.Rejected, EventStatus.Dispatched, EventStatus.Failed],
    'Failed',
    senderId,
  ),
  new ReportScenario(
    'component-test-rejected-dispatched-failed-returned',
    CommunicationType.Print,
    [
      EventStatus.Rejected,
      EventStatus.Dispatched,
      EventStatus.Failed,
      EventStatus.Returned,
    ],
    'Returned',
    senderId,
  ),
];

/**
 * To test the report generator lambda requires a set of steps for the lambda to consume the data so it can generate reports. The steps are as follows:
 *
 * 1. Events from EventBridge are received by firehose stream $CSI-to-s3-reporting. Note that delivering the events to S3 can take long time.
 * 1.1 The events are flattened out by the lambda report-event-transformer
 * 1.2. Firehose outputs the transformed event to S3 reporting bucket under prefix /kinesis-firehose-output/reporting/parquet/event_record and partitioned by client ID and date
 * 2. The data in S3 is exposed as an external table using AWS Glue with a schema and partitions.
 * 2.1. To update the data in Glue, a step function is used to trigger a metadata refresh on the Glue table, which causes it to pick up any new files in S3.
 * 3. In Athena there is a database called {csi}-reporting, which has the table event_record.
 * 3.1. The table event_record is partitioned by senderId and date.
 * 4. The GenerateReport event triggers the execution of the report-generator lambda for a specific senderId and date.
 * 4.1 The report-generator lambda sends a query to Athena (StartQueryExecutionCommand) and polls for the result until the query has completed. The query reads from the Glue table, which surfaces the data in S3.
 * 4.2 The output from the Athena workgroup is under s3-reporting bucket, prefix /athena-output/
 * 4.3 Once the query has completed, the report-generator lambda writes the output to S3, and emits a ReportGenerated event.
 *
 * So the steps 1-3 are all prerequisites for the report-generator lambda to be able to generate reports, where as the step 4 is for testing the report-generator lambda.
 *
 * Keeping console.log through the test to make it easier to debug in case of error.
 */
test.describe('Digital Letters - Report Generator', () => {
  test('should generate a report containing the expected statuses', async () => {
    // We need to wait for events to make their way from EventBridge -> Firehose -> S3 -> Glue
    test.setTimeout(900_000);

    // Use a random sender ID, so we can be sure that if there are files with this prefix
    // in S3 they've been created by this test.

    // eslint-disable-next-line no-console
    console.log(`Using senderId: ${senderId}`);

    for (const scenario of scenarios) publishEventForScenario(scenario);
    // At this stage we published all the events used for test data.
    await publishEventNotInReports(senderId);
    // Asserts step 1.2
    await prerequisiteAssertFirehoseEventsInS3(senderId);
    // Asserts step 2.1
    await prerequisiteTriggerAndAssertGlueTableRefresh();

    const generateReportEventId = uuidv4();
    const generateReportEventTime = new Date().toISOString();
    const reportDate = new Date().toISOString().split('T')[0];

    // Step 4, start of the test.
    await publishGenerateReport(
      generateReportEventId,
      generateReportEventTime,
      reportDate,
      senderId,
    );

    // Perform assertions that the report generation and publishing the ReportGenerated are ok.
    const reportKey = `transactional-reports/${senderId}/completed_communications/completed_communications_${reportDate}.csv`;

    await assertReportIsPublishedInReportingBucket(reportKey);

    const report = await downloadFromS3(REPORTING_S3_BUCKET_NAME, reportKey);
    // eslint-disable-next-line no-console
    console.log('Received report:', report.body);
    const reportRows = parse(report.body, { columns: true });
    const expectedReportRows = scenarios.map((scenario) =>
      scenario.getExpectedReportRow(),
    );
    expect(reportRows.length).toEqual(10);
    expect(reportRows).toEqual(expect.arrayContaining(expectedReportRows));

    const expectedReportUri = `s3://${REPORTING_S3_BUCKET_NAME}/${reportKey}`;
    // Verify ReportGenerated event published
    await assertReportGeneratedEventIsPublished(senderId, expectedReportUri);
  });

  test('should generate a report even when there are not any events', async () => {
    // We need to wait for events to make their way from EventBridge -> Firehose -> S3 -> Glue
    test.setTimeout(120_000);

    // eslint-disable-next-line no-console
    console.log(`Using unknownSenderId: ${unknownSenderId}`);

    const generateReportEventId = uuidv4();
    const generateReportEventTime = new Date().toISOString();
    const reportDate = new Date().toISOString().split('T')[0];

    // Step 4, start of the test.
    await publishGenerateReport(
      generateReportEventId,
      generateReportEventTime,
      reportDate,
      unknownSenderId,
    );

    // Perform assertions that the report generation and publishing the ReportGenerated are ok.
    const reportKey = `transactional-reports/${unknownSenderId}/completed_communications/completed_communications_${reportDate}.csv`;

    await assertReportIsPublishedInReportingBucket(reportKey);

    const report = await downloadFromS3(REPORTING_S3_BUCKET_NAME, reportKey);
    // eslint-disable-next-line no-console
    console.log('Received report:', report.body);
    const reportRows = parse(report.body, { columns: true });
    expect(reportRows.length).toEqual(0);

    const expectedReportUri = `s3://${REPORTING_S3_BUCKET_NAME}/${reportKey}`;
    // Verify ReportGenerated event published
    await assertReportGeneratedEventIsPublished(
      unknownSenderId,
      expectedReportUri,
    );
  });
});
