import { expect, test } from '@playwright/test';
import getTtl from 'helpers/dynamodb-helpers';
import eventPublisher from 'helpers/event-bus-helpers';
import expectToPassEventually from 'helpers/expectations';
import { v4 as uuidv4 } from 'uuid';

test.describe('Digital Letters - Create TTL', () => {
  test('should create TTL following downloaded message event', async () => {
    const letterId = uuidv4();
    const messageUri = `https://example.com/ttl/resource/${letterId}`;

    await eventPublisher.sendEvents([
      {
        profileversion: '1.0.0',
        profilepublished: '2025-10',
        id: letterId,
        specversion: '1.0',
        source:
          '/nhs/england/notify/production/primary/data-plane/digital-letters',
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
          messageUri,
          'digital-letter-id': letterId,
          messageReference: 'ref1',
          senderId: 'sender1',
        },
      },
    ]);

    await expectToPassEventually(async () => {
      const ttl = await getTtl(messageUri);

      expect(ttl.length).toBe(1);
    });
  });
});
