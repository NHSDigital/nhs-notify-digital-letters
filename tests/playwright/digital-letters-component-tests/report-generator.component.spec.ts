import { expect, test } from '@playwright/test';
import {
  ATHENA_WORKGROUP_NAME,
  GLUE_DATABASE_NAME,
  GLUE_TABLE_NAME,
  REPORTING_S3_BUCKET_NAME,
  REPORTING_S3_KEY_PREFIX,
} from 'constants/backend-constants';
import { MESHInboxMessageDownloaded } from 'digital-letters-events';
import messageDownloadedValidator from 'digital-letters-events/MESHInboxMessageDownloaded.js';
import {
  QueryExecutionState,
  getQueryState,
  triggerTableMetadataRefresh,
} from 'helpers/athena-helpers';
import eventPublisher from 'helpers/event-bus-helpers';
import expectToPassEventually from 'helpers/expectations';
import { existsInS3 } from 'helpers/s3-helpers';
import { v4 as uuidv4 } from 'uuid';

test.describe('Digital Letters - Report Generator', () => {
  test.beforeAll(async () => {
    // We need to wait for events to make their way from EventBridge -> Firehose -> S3 -> Glue
    test.setTimeout(300_000);

    // Use a random sender ID, so we can be sure that if there are files with this prefix
    // in S3 they've been created by this test.
    const senderId = `report-generator-test-${uuidv4()}`;

    const eventId = uuidv4();
    await eventPublisher.sendEvents<MESHInboxMessageDownloaded>(
      [
        {
          id: eventId,
          specversion: '1.0',
          source:
            '/nhs/england/notify/production/primary/data-plane/digitalletters/mesh',
          subject:
            'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
          type: 'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1',
          time: '2023-06-20T12:00:00Z',
          recordedtime: '2023-06-20T12:00:00.250Z',
          severitynumber: 2,
          traceparent:
            '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
          datacontenttype: 'application/json',
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-mesh-inbox-message-downloaded-data.schema.json',
          severitytext: 'INFO',
          data: {
            meshMessageId: '12345',
            messageUri: `https://example.com/ttl/resource/${eventId}`,
            messageReference: 'ref1',
            senderId,
          },
        },
      ],
      messageDownloadedValidator,
    );

    await expectToPassEventually(async () => {
      const eventsHaveBeenWrittenToS3 = await existsInS3(
        REPORTING_S3_BUCKET_NAME,
        `${REPORTING_S3_KEY_PREFIX}/senderid=${senderId}`,
      );

      expect(eventsHaveBeenWrittenToS3).toBeTruthy();
    }, 300_000);

    // Trigger a metadata refresh for the Glue table, which will cause it to pick up any new files in S3
    const refreshQueryExecutionId = await triggerTableMetadataRefresh(
      GLUE_DATABASE_NAME,
      GLUE_TABLE_NAME,
      ATHENA_WORKGROUP_NAME,
    );

    await expectToPassEventually(async () => {
      const refreshQueryState = await getQueryState(refreshQueryExecutionId);

      expect(refreshQueryState).toEqual(QueryExecutionState.SUCCEEDED);
    });
  });

  test('should test something', async () => {});
});
