import { expect } from '@playwright/test';
import {
  ATHENA_WORKGROUP_NAME,
  ENV,
  GLUE_DATABASE_NAME,
  GLUE_TABLE_NAME,
  REPORTING_S3_BUCKET_NAME,
  REPORTING_S3_FIREHOSE_OUTPUT_KEY_PREFIX,
} from 'constants/backend-constants';
import { v4 as uuidv4 } from 'uuid';

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
import {
  buildItemDequeuedEvent,
  buildItemRemovedEvent,
  buildPrintLetterTransitionedEvent,
} from 'helpers/event-builders';
import { existsInS3 } from 'helpers/s3-helpers';

export enum CommunicationType {
  Digital = 'Digital',
  Print = 'Print',
}

export enum EventStatus {
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
/**
 * Utility class to proof the SQL logic to determine which status should be reported for a given message reference,
 * based on the events received for that message reference.
 */
export class ReportScenario {
  readonly messageReference: string;

  readonly communicationType: CommunicationType;

  readonly eventStatuses: EventStatus[];

  readonly expectedStatus: string;

  readonly senderId: string;

  time: string;

  constructor(
    messageReference: string,
    communicationType: CommunicationType,
    eventStatuses: EventStatus[],
    expectedStatus: string,
    senderId: string,
  ) {
    this.messageReference = messageReference;
    this.communicationType = communicationType;
    this.eventStatuses = eventStatuses;
    this.expectedStatus = expectedStatus;
    this.senderId = senderId;
    this.time = ''; // Set when publishing the event to EventBridge, otherwise all the events would have the same timestamp.
  }

  getExpectedReportRow() {
    return {
      'Message Reference': this.messageReference,
      Time: this.time,
      'Communication Type': this.communicationType,
      Status: this.expectedStatus,
    };
  }

  initialiseTime() {
    this.time = new Date().toISOString();
  }
}

// Publish functions

export function publishEventForScenario(scenario: ReportScenario) {
  scenario.initialiseTime();
  for (const status of scenario.eventStatuses) {
    switch (scenario.communicationType) {
      case CommunicationType.Digital: {
        if (EventStatus.Read === status) {
          eventPublisher.sendEvents<ItemRemoved>(
            [
              buildItemRemovedEvent(
                uuidv4(),
                scenario.time,
                scenario.messageReference,
                scenario.senderId,
              ),
            ],
            itemRemovedValidator,
          );
        } else if (EventStatus.Unread === status) {
          eventPublisher.sendEvents<ItemDequeued>(
            [
              buildItemDequeuedEvent(
                uuidv4(),
                scenario.time,
                scenario.messageReference,
                scenario.senderId,
              ),
            ],
            itemDequeuedValidator,
          );
        }
        break;
      }
      case CommunicationType.Print: {
        eventPublisher.sendEvents<PrintLetterTransitioned>(
          [
            buildPrintLetterTransitionedEvent(
              uuidv4(),
              scenario.time,
              scenario.messageReference,
              status,
              scenario.senderId,
            ),
          ],
          printLetterTransitionedValidator,
        );
        break;
      }
      default: {
        throw new Error(
          `Unknown communication type: ${scenario.communicationType}`,
        );
      }
    }
  }
}

export async function publishGenerateReport(
  generateReportEventId: string,
  generateReportEventTime: string,
  reportDate: string,
  senderId: string,
) {
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
        traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
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
}

/**
 * Publishes an event which should not be included in the report, to prove that only the expected events are included in the report.
 */
export async function publishEventNotInReports(senderId: string) {
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
        traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
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
}

// Prerequisite functions

/**
 * Checks that the events published to EventBridge have made their way through Firehose and are now in S3, before proceeding with the test.
 * This is necessary because there can be a significant delay between when events are published to EventBridge and when they are available in S3 for Athena to query,
 * and we want to avoid starting the report generation process before the data is available, which would cause the test to fail.
 */
export async function prerequisiteAssertFirehoseEventsInS3(
  expectedSenderId: string,
) {
  await expectToPassEventually(
    async () => {
      // eslint-disable-next-line no-console
      console.log(
        'Checking for events in S3 with prefix:',
        `${REPORTING_S3_FIREHOSE_OUTPUT_KEY_PREFIX}/senderid=${expectedSenderId}`,
      );
      const eventsHaveBeenWrittenToS3 = await existsInS3(
        REPORTING_S3_BUCKET_NAME,
        `${REPORTING_S3_FIREHOSE_OUTPUT_KEY_PREFIX}/senderid=${expectedSenderId}`,
      );

      expect(eventsHaveBeenWrittenToS3).toBeTruthy();
    },
    600_000,
    10,
  );
}

/**
 * Trigger a metadata refresh for the Glue table, which will cause it to pick up any new files in S3.
 */
export async function prerequisiteTriggerAndAssertGlueTableRefresh() {
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
}

// Assertion functions

export async function assertReportIsPublishedInReportingBucket(
  reportKey: string,
) {
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
}

export async function assertReportGeneratedEventIsPublished(
  expectedSenderId: string,
  expectedReportUri: string,
) {
  await expectToPassEventually(async () => {
    const eventLogEntry = await getLogsFromCloudwatch(
      `/aws/vendedlogs/events/event-bus/nhs-${ENV}-dl`,
      [
        '$.message_type = "EVENT_RECEIPT"',
        '$.details.detail_type = "uk.nhs.notify.digital.letters.reporting.report.generated.v1"',
        `$.details.event_detail = "*\\"senderId\\":\\"${expectedSenderId}\\"*"`,
        `$.details.event_detail = "*\\"reportUri\\":\\"${expectedReportUri}\\"*"`,
      ],
    );

    expect(eventLogEntry.length).toEqual(1);
  });
}
