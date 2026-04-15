import { expect, test } from '@playwright/test';
import {
  ENV,
  NHSAPP_STATUS_HANDLER_DLQ_NAME,
} from 'constants/backend-constants';
import { SENDER_ID_VALID_FOR_NOTIFY_SANDBOX } from 'constants/tests-constants';
import { MESHInboxMessageDownloaded } from 'digital-letters-events';
import { getLogsFromCloudwatch } from 'helpers/cloudwatch-helpers';
import { getTtl, putTtl } from 'helpers/dynamodb-helpers';
import eventPublisher from 'helpers/event-bus-helpers';
import expectToPassEventually from 'helpers/expectations';
import { purgeQueue } from 'helpers/sqs-helpers';
import { v4 as uuidv4 } from 'uuid';

test.describe('Digital Letters - Create TTL', () => {
  test.beforeAll(async () => {
    await purgeQueue(NHSAPP_STATUS_HANDLER_DLQ_NAME);
  });

  const baseEvent: MESHInboxMessageDownloaded = {
    id: 'id',
    specversion: '1.0',
    source:
      '/nhs/england/notify/production/primary/data-plane/digitalletters/mesh',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    type: 'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1',
    time: '2023-06-20T12:00:00Z',
    recordedtime: '2023-06-20T12:00:00.250Z',
    severitynumber: 2,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-mesh-inbox-message-downloaded-data.schema.json',
    severitytext: 'INFO',
    data: {
      meshMessageId: '12345',
      messageUri: 'uri',
      messageReference: 'ref1',
      senderId: SENDER_ID_VALID_FOR_NOTIFY_SANDBOX,
    },
  };

  test('should delete TTL and publish digital.letter.read event following a channel.status.PUBLISHED event', async () => {
    const event = {
      ...baseEvent,
      data: {
        ...baseEvent.data,
        messageReference: uuidv4(),
      },
    };

    const concatedReference = `${event.data.senderId}_${event.data.messageReference}`;

    const ttlItem = {
      PK: concatedReference,
      SK: 'TTL',
      dateOfExpiry: '2023-12-31#0',
      event,
      ttl: Date.now() / 1000 + 3600,
    };

    const putResponseCode = await putTtl(ttlItem);
    expect(putResponseCode).toBe(200);

    // Verify TTL created
    await expectToPassEventually(async () => {
      const ttl = await getTtl(concatedReference);

      expect(ttl.length).toBe(1);
    });

    await eventPublisher.sendEvents<any>(
      [
        {
          data: {
            messageReference: concatedReference,
            supplierStatus: 'PaperLetterOptedOut',
          },
        },
      ],
      () => true,
    );

    // Verify digital.letter.read event published
    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        `/aws/vendedlogs/events/event-bus/nhs-${ENV}-dl`,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.queue.digital.letter.read.v1"',
          `$.details.event_detail = "*\\"messageReference\\":\\"${event.data.messageReference}\\"*"`,
        ],
      );

      expect(eventLogEntry.length).toEqual(1);
    });
  });
});
