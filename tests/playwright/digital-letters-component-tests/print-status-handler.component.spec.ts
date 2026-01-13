import { expect, test } from '@playwright/test';
import { LetterEvent } from '@nhsdigital/nhs-notify-event-schemas-supplier-api/src/events/letter-events';
import { ENV } from 'constants/backend-constants';
import { getLogsFromCloudwatch } from 'helpers/cloudwatch-helpers';
import eventPublisher from 'helpers/event-bus-helpers';
import expectToPassEventually from 'helpers/expectations';
import { v4 as uuidv4 } from 'uuid';

const baseLetterEvent = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  specversion: '1.0',
  source: '/data-plane/supplier-api/prod/update-status',
  subject:
    'letter-origin/digital-letters/letter/f47ac10b-58cc-4372-a567-0e02b2c3d479',
  type: 'uk.nhs.notify.supplier-api.letter.ACCEPTED.v1',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/supplier-api/letter.ACCEPTED.1.0.0.schema.json',
  dataschemaversion: '1.0.0',
  time: '2023-06-20T12:00:00Z',
  recordedtime: '2023-06-20T12:00:00.250Z',
  severitynumber: 2,
  traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
  datacontenttype: 'application/json',
  severitytext: 'INFO',
  plane: 'data',
  data: {
    domainId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    groupId: 'client_template',
    origin: {
      domain: 'letter-rendering',
      event: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      source: '/data-plane/letter-rendering/prod/render-pdf',
      subject:
        'client/00f3b388-bbe9-41c9-9e76-052d37ee8988/letter-request/0o5Fs0EELR0fUjHjbCnEtdUwQe4_0o5Fs0EELR0fUjHjbCnEtdUwQe5',
    },
    specificationId: '1y3q9v1zzzz',
    supplierId: 'supplier-1',
    status: 'ACCEPTED',
  },
} as LetterEvent;

test.describe('Print status handler', () => {
  test.beforeAll(async () => {
    test.setTimeout(150_000);
  });

  test('should create print.letter.transitioned ACCEPTED event for a letters.ACCEPTED event', async () => {
    const messageReference = uuidv4();
    const acceptedLetterEvent = {
      ...baseLetterEvent,
      data: {
        ...baseLetterEvent.data,
        origin: {
          ...baseLetterEvent.data.origin,
          subject: `letter-origin/digital-letters/letter/${messageReference}`,
        },
      },
    };

    await eventPublisher.sendEvents<LetterEvent>(
      [acceptedLetterEvent],
      () => true,
    );

    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        `/aws/vendedlogs/events/event-bus/nhs-${ENV}-dl`,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.print.letter.transitioned.v1"',
          `$.details.event_detail = "*\\"messageReference\\":\\"${messageReference}\\"*"`,
          `$.details.event_detail = "*\\"status\\":\\"ACCEPTED\\"*"`,
        ],
      );

      expect(eventLogEntry.length).toEqual(1);
    }, 120);
  });
});
