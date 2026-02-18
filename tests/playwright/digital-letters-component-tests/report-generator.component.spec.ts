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
  ItemDequeued,
  ItemRemoved,
  MESHInboxMessageDownloaded,
  PrintLetterTransitioned,
} from 'digital-letters-events';
import generateReportValidator from 'digital-letters-events/GenerateReport.js';
import itemRemovedValidator from 'digital-letters-events/ItemRemoved.js';
import messageDownloadedValidator from 'digital-letters-events/MESHInboxMessageDownloaded.js';
import itemDequeuedValidator from 'digital-letters-events/ItemDequeued.js';
import printLetterTransitionedValidator from 'digital-letters-events/PrintLetterTransitioned.js';
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

function buildBaseEvent(sourceComponent : string, time : string ) {
  return {
    specversion: '1.0',
    source:
      `/nhs/england/notify/production/primary/data-plane/digitalletters/${sourceComponent}`,
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    time: time,
    recordedtime: time,
    severitynumber: 2,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    datacontenttype: 'application/json',
    severitytext: 'INFO',
  };
}

function buildItemRemovedEvent(eventId : string, time: string, messageReference: string): ItemRemoved {
  let baseEvent = buildBaseEvent('queue', time);
  return {...baseEvent,
        id: eventId,
        type: 'uk.nhs.notify.digital.letters.queue.item.removed.v1',
        dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-queue-item-removed-data.schema.json',
        data: {
            messageReference: messageReference,
            senderId,
            messageUri: `https://example.com/ttl/resource/${eventId}`,
          },
  } as ItemRemoved;
}

function buildItemDequeuedEvent(eventId : string, time: string, messageReference: string): ItemDequeued {
  let baseEvent = buildBaseEvent('queue', time);
  return {...baseEvent,
        id: eventId,
        type: 'uk.nhs.notify.digital.letters.queue.item.dequeued.v1',
        dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-queue-item-dequeued-data.schema.json',
        data: {
            messageReference: messageReference,
            senderId,
            messageUri: `https://example.com/ttl/resource/${eventId}`,
          },
  } as ItemDequeued;
}

function buildPrintLetterTransitionedEvent(eventId : string, time: string, messageReference: string, status: string): PrintLetterTransitioned {
  let baseEvent = buildBaseEvent('print', time);
  return {...baseEvent,
        id: eventId,
        type: 'uk.nhs.notify.digital.letters.print.letter.transitioned.v1',
        dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-print-letter-transitioned-data.schema.json',
        data: {
            messageReference: messageReference,
            senderId,
            status: status,
            supplierId: 'supplier-1',
            time: time,
          },
  } as PrintLetterTransitioned;
}

enum CommunicationType {
  Digital = 'Digital',
  Print = 'Print',
}

enum EventStatus {
  Read = 'Read',
  Unread = 'Unread',
  Accepted = 'ACCEPTED',
  Rejected = 'REJECTED',
  Printed = 'PRINTED',
  Dispatched = 'DISPATCHED',
  Failed = 'FAILED',
  Returned = 'RETURNED',
  Pending = 'PENDING',
}

class ReportScenario {
  readonly messageReference: string;
  readonly communicationType: CommunicationType;
  readonly eventStatuses: EventStatus[];
  readonly expectedStatus: string;
  time: string;

  constructor(messageReference: string, communicationType: CommunicationType, eventStatuses: EventStatus[], expectedStatus: string) {
    this.messageReference = messageReference;
    this.communicationType = communicationType;
    this.eventStatuses = eventStatuses;
    this.expectedStatus = expectedStatus;
    this.time = ''; // Set when publishing the event to EventBridge, otherwise all the events would have the same timestamp.
  }

  getExpectedReportRow() {
    return {
      'Message Reference': this.messageReference,
      Time: this.time,
      'Communication Type': this.communicationType,
      Status: this.expectedStatus,
    }
  }

  initialiseTime(){
    this.time = new Date().toISOString();
  }
}

function publishEventForScenario(scenario: ReportScenario) {
  scenario.initialiseTime();
  scenario.eventStatuses.forEach(status => {
    switch(scenario.communicationType) {
      case CommunicationType.Digital:
        if (EventStatus.Read === status) {
          eventPublisher.sendEvents<ItemRemoved>(
            [
              buildItemRemovedEvent(uuidv4(), scenario.time, scenario.messageReference),
            ],
            itemRemovedValidator,
          );
        } else if (EventStatus.Unread === status) {
          eventPublisher.sendEvents<ItemDequeued>(
            [
              buildItemDequeuedEvent(uuidv4(), scenario.time, scenario.messageReference),
            ],
            itemDequeuedValidator,
          );
        }
        break;
      case CommunicationType.Print:
          eventPublisher.sendEvents<PrintLetterTransitioned>(
            [
              buildPrintLetterTransitionedEvent(uuidv4(), scenario.time, scenario.messageReference, status),
            ],
            printLetterTransitionedValidator,
          );
        break;
      }
    });
  }

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


const senderId = `report-generator-test-${uuidv4()}`;

test.describe('Digital Letters - Report Generator', () => {
  test('should generate a report containing the expected statuses', async () => {
    // We need to wait for events to make their way from EventBridge -> Firehose -> S3 -> Glue
    test.setTimeout(900_000);

    // Use a random sender ID, so we can be sure that if there are files with this prefix
    // in S3 they've been created by this test.

    // eslint-disable-next-line no-console
    console.log(`Using senderId: ${senderId}`);

    const scenarios = [
      new ReportScenario('component-test-itemRemoved', CommunicationType.Digital, [EventStatus.Read], 'Read'),
      new ReportScenario('component-test-itemDequeued', CommunicationType.Digital, [EventStatus.Unread], 'Unread'),
      // Scenarios for communication type Print where there is a single event per message reference.
      new ReportScenario('component-test-rejected', CommunicationType.Print, [EventStatus.Rejected], 'Rejected'),
      new ReportScenario('component-test-failed', CommunicationType.Print, [EventStatus.Failed], 'Failed'),
      new ReportScenario('component-test-returned', CommunicationType.Print, [EventStatus.Returned], 'Returned'),
      new ReportScenario('component-test-dispatched', CommunicationType.Print, [EventStatus.Dispatched], 'Dispatched'),
      // multiple events for the same message reference, should take the one with highest priority status (returned > failed > dispatched > rejected)
      new ReportScenario('component-test-rejected-pending', CommunicationType.Print, [EventStatus.Rejected, EventStatus.Pending], 'Rejected'), // pending is ignored.
      new ReportScenario('component-test-rejected-dispatched', CommunicationType.Print, [EventStatus.Rejected, EventStatus.Dispatched], 'Dispatched'),
      new ReportScenario('component-test-rejected-dispatched-failed', CommunicationType.Print, [EventStatus.Rejected, EventStatus.Dispatched, EventStatus.Failed], 'Failed'),
      new ReportScenario('component-test-rejected-dispatched-failed-returned', CommunicationType.Print, [EventStatus.Rejected, EventStatus.Dispatched, EventStatus.Failed, EventStatus.Returned], 'Returned'),
    ];
    scenarios.forEach(scenario => publishEventForScenario(scenario));

    // Communication type should be Digital, and the status should be Read
    // const itemRemovedEventTime = new Date().toISOString();
    // await eventPublisher.sendEvents<ItemRemoved>(
    //   [
    //     buildItemRemovedEvent(uuidv4(), itemRemovedEventTime, 'component-test-itemRemoved'),
    //   ],
    //   itemRemovedValidator,
    // );
    // // Communication type should be Digital, and the status should be Unread
    // const itemDequeuedEventTime = new Date().toISOString();
    // await eventPublisher.sendEvents<ItemDequeued>(
    //   [
    //     buildItemDequeuedEvent(uuidv4(), itemDequeuedEventTime, 'component-test-itemDequeued'),
    //   ],
    //   itemDequeuedValidator,
    // );

    // const printLetterEventTime = new Date().toISOString();
    // await eventPublisher.sendEvents<PrintLetterTransitioned>(
    //   [
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTime, 'component-test-transition-rejected', 'PENDING'),
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTime, 'component-test-transition-rejected', 'REJECTED'),
    //     // accepted should not be displayed
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTime, 'component-test-transition-dispatched', 'ACCEPTED'),
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTime, 'component-test-transition-dispatched', 'DISPATCHED'),
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTime, 'component-test-transition-failed', 'FAILED'),
    //     // printed should not be displayed
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTime, 'component-test-transition-returned', 'PRINTED'),
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTime, 'component-test-transition-returned', 'RETURNED'),
    //   ],
    //   printLetterTransitionedValidator,
    // );
    // const printLetterEventTimeOrderedEvent = new Date().toISOString();
    // await eventPublisher.sendEvents<PrintLetterTransitioned>(
    //   [
    //     // should display dispatched
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTimeOrderedEvent, 'component-test-transition-rejected-dispatched', 'REJECTED'),
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTimeOrderedEvent, 'component-test-transition-rejected-dispatched', 'DISPATCHED'),
    //     // should display failed
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTimeOrderedEvent, 'component-test-transition-rejected-dispatched-failed', 'REJECTED'),
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTimeOrderedEvent, 'component-test-transition-rejected-dispatched-failed', 'DISPATCHED'),
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTimeOrderedEvent, 'component-test-transition-rejected-dispatched-failed', 'FAILED'),
    //     // should display returned
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTimeOrderedEvent, 'component-test-transition-rejected-dispatched-failed-returned', 'REJECTED'),
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTimeOrderedEvent, 'component-test-transition-rejected-dispatched-failed-returned', 'DISPATCHED'),
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTimeOrderedEvent, 'component-test-transition-rejected-dispatched-failed-returned', 'FAILED'),
    //     buildPrintLetterTransitionedEvent(uuidv4(), printLetterEventTimeOrderedEvent, 'component-test-transition-rejected-dispatched-failed-returned', 'RETURNED'),
    //   ],
    //   printLetterTransitionedValidator,
    // );

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
        // eslint-disable-next-line no-console
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
      600_000,
      10,
    );

    // Trigger a metadata refresh for the Glue table, which will cause it to pick up any new files in S3
    const refreshQueryExecutionId = await triggerTableMetadataRefresh(
      GLUE_DATABASE_NAME,
      GLUE_TABLE_NAME,
      ATHENA_WORKGROUP_NAME,
    );

    await expectToPassEventually(async () => {
      // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
    console.log('Received report:', report.body);

    const reportRows = parse(report.body, { columns: true });
    // reportRows.sort((a, b) => a.Time.localeCompare(b.Time)); // Sort the report rows by time, to match the order of the scenarios
    //  const expectedReportRows = scenarios.map(scenario => scenario.getExpectedReportRow()).sort((a, b) => a.Time.localeCompare(b.Time)); // The report is in descending order, so reverse the expected rows to match that order
    const expectedReportRows = scenarios.map(scenario => scenario.getExpectedReportRow());
    console.log('Expected report rows:', expectedReportRows);
    expect(reportRows.length).toEqual(expectedReportRows.length);
    expect(reportRows).toEqual(expect.arrayContaining(expectedReportRows));
    // expect(reportRows).toEqual([
    //   {
    //     'Message Reference': 'component-test-itemRemoved',
    //     Time: itemRemovedEventTime,
    //     'Communication Type': 'Digital',
    //     Status: 'Read',
    //   },
    //   {
    //     'Message Reference': 'component-test-itemDequeued',
    //     Time: itemDequeuedEventTime,
    //     'Communication Type': 'Digital',
    //     Status: 'Unread',
    //   },
    //   {
    //     'Message Reference': 'component-test-transition-returned',
    //     Time: printLetterEventTime,
    //     'Communication Type': 'Print',
    //     Status: 'Returned',
    //   },
    //   {
    //     'Message Reference': 'component-test-transition-rejected',
    //     Time: printLetterEventTime,
    //     'Communication Type': 'Print',
    //     Status: 'Rejected',
    //   },
    //   {
    //     'Message Reference': 'component-test-transition-failed',
    //     Time: printLetterEventTime,
    //     'Communication Type': 'Print',
    //     Status: 'Failed',
    //   },
    //   {
    //     'Message Reference': 'component-test-transition-dispatched',
    //     Time: printLetterEventTime,
    //     'Communication Type': 'Print',
    //     Status: 'Dispatched',
    //   },
    //   {
    //     'Message Reference': 'component-test-transition-rejected-dispatched',
    //     Time: printLetterEventTimeOrderedEvent,
    //     'Communication Type': 'Print',
    //     Status: 'Dispatched',
    //   },
    //   {
    //     'Message Reference': 'component-test-transition-rejected-dispatched-failed',
    //     Time: printLetterEventTimeOrderedEvent,
    //     'Communication Type': 'Print',
    //     Status: 'Failed',
    //   },
    //   {
    //     'Message Reference': 'component-test-transition-rejected-dispatched-failed-returned',
    //     Time: printLetterEventTimeOrderedEvent,
    //     'Communication Type': 'Print',
    //     Status: 'Returned',
    //   },
    // ]);

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
});
