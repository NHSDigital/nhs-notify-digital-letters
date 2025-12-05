import { expect, test } from '@playwright/test';
import { ENV } from 'constants/backend-constants';
import { getLogsFromCloudwatch } from 'helpers/cloudwatch-helpers';
import { deleteTtl, putTtl } from 'helpers/dynamodb-helpers';
import expectToPassEventually from 'helpers/expectations';
import { v4 as uuidv4 } from 'uuid';

test.describe('Digital Letters - Handle TTL', () => {
  const baseEvent = {
    profileversion: '1.0.0',
    profilepublished: '2025-10',
    specversion: '1.0',
    source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    type: 'uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1',
    time: '2023-06-20T12:00:00Z',
    recordedtime: '2023-06-20T12:00:00.250Z',
    severitynumber: 2,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letter-base-data.schema.json',
    dataschemaversion: '1.0',
    severitytext: 'INFO',
    data: {
      messageReference: 'ref1',
      senderId: 'sender1',
    },
  };

  test('should handle withdrawn item', async () => {
    const letterId = uuidv4();
    const messageUri = `https://example.com/ttl/resource/${letterId}`;

    const event = {
      ...baseEvent,
      id: letterId,
      data: {
        ...baseEvent.data,
        messageUri,
        'digital-letter-id': letterId,
      },
    };

    const ttlItem = {
      PK: messageUri,
      SK: 'TTL',
      dateOfExpiry: '2023-12-31#0',
      event,
      ttl: Date.now() / 1000 + 3600,
      withdrawn: true,
    };

    const putResponseCode = await putTtl(ttlItem);
    expect(putResponseCode).toBe(200);

    const deleteResponseCode = await deleteTtl(messageUri);
    expect(deleteResponseCode).toBe(200);

    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        `/aws/lambda/nhs-${ENV}-dl-ttl-handle-expiry`,
        `{ ($.message.messageUri = "${messageUri}") && ($.message.description = "ItemDequeued event not sent as item withdrawn") }`,
      );

      expect(eventLogEntry.length).toEqual(1);
    });
  });

  test('should handle expired item', async () => {
    const letterId = uuidv4();
    const messageUri = `https://example.com/ttl/resource/${letterId}`;

    const event = {
      ...baseEvent,
      id: letterId,
      data: {
        ...baseEvent.data,
        messageUri,
        'digital-letter-id': letterId,
      },
    };

    const ttlItem = {
      PK: messageUri,
      SK: 'TTL',
      dateOfExpiry: '2023-12-31#0',
      event,
      ttl: Date.now() / 1000 + 3600,
    };

    const putResponseCode = await putTtl(ttlItem);
    expect(putResponseCode).toBe(200);

    const deleteResponseCode = await deleteTtl(messageUri);
    expect(deleteResponseCode).toBe(200);

    await expectToPassEventually(async () => {
      await expectToPassEventually(async () => {
        const eventLogEntry = await getLogsFromCloudwatch(
          `/aws/vendedlogs/events/event-bus/nhs-${ENV}-dl`,
          `{ ($.id = "${letterId}") }`,
        );

        expect(eventLogEntry.length).toEqual(1);
      });
    });
  });
});
