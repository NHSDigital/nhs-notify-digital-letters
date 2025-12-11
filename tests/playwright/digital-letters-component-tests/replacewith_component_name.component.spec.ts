import { expect, test } from '@playwright/test';
import {
  REPLACEWITH_COMPONENT_NAME_DLQ_NAME,
  REPLACEWITH_COMPONENT_NAME_LAMBDA_LOG_GROUP_NAME,
  EVENT_BUS_LOG_GROUP_NAME,
} from 'constants/backend-constants';
import { PDMResourceAvailable } from 'digital-letters-events';
import messagePDMResourceAvailableValidator from 'digital-letters-events/PDMResourceAvailable.js';
import { getLogsFromCloudwatch } from 'helpers/cloudwatch-helpers';
import eventPublisher from 'helpers/event-bus-helpers';
import expectToPassEventually from 'helpers/expectations';
import { expectMessageContainingString, purgeQueue } from 'helpers/sqs-helpers';
import { v4 as uuidv4 } from 'uuid';

const baseEvent: Omit<PDMResourceAvailable, 'id' | 'data'> = {
  specversion: '1.0',
  source:
    '/nhs/england/notify/production/primary/data-plane/digitalletters/pdm',
  subject:
    'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
  type: 'uk.nhs.notify.digital.letters.pdm.resource.available.v1',
  time: '2023-06-20T12:00:00Z',
  recordedtime: '2023-06-20T12:00:00.250Z',
  severitynumber: 2,
  traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
  datacontenttype: 'application/json',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-available-data.schema.json',
  severitytext: 'INFO',
};

test.describe('Digital Letters - Core Notify', () => {
  test.beforeAll(async () => {
    await purgeQueue(REPLACEWITH_COMPONENT_NAME_DLQ_NAME);
    test.setTimeout(250_000);
  });

  test.afterAll(async () => {
    await purgeQueue(REPLACEWITH_COMPONENT_NAME_DLQ_NAME);
  });

  test('given PDMResourceAvailable event, when client has routingConfigId then a message is sent to core Notify', async () => {
    const eventId = uuidv4();
    const messageReference = uuidv4();
    const resourceId = 'resource-222';

    await eventPublisher.sendEvents<PDMResourceAvailable>(
      [
        {
          ...baseEvent,
          id: eventId,
          data: {
            messageReference,
            senderId: "sender-id",
            resourceId,
            nhsNumber: '9990548609',
            odsCode: 'A12345',
          },
        },
      ],
      messagePDMResourceAvailableValidator,
    );

    // Verify the event is processed and a message appears in the Lambda logs
    await expectToPassEventually(async () => {
      const filteredLogs = await getLogsFromCloudwatch(
        REPLACEWITH_COMPONENT_NAME_LAMBDA_LOG_GROUP_NAME,
        [
          '$.message.description  = "Successfully processed request and sent to Notify"',
          `$.message.messageReference  = "${messageReference}"`,
        ],
      );

      expect(filteredLogs.length).toEqual(1);
    }, 240);

    // Verify the event is published in the event bus
    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        EVENT_BUS_LOG_GROUP_NAME,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.messages.request.submitted.v1"',
          `$.details.event_detail = "*\\"messageReference\\":\\"${messageReference}\\"*"`,
        ],
      );

      expect(eventLogEntry.length).toEqual(1);
    }, 240);
  });

  test('given PDMResourceAvailable event, when client does NOT exist then it goes to DLQ', async () => {
    test.setTimeout(550_000);
    const eventId = uuidv4();
    const messageReference = uuidv4();

    await eventPublisher.sendEvents<PDMResourceAvailable>(
      [
        {
          ...baseEvent,
          id: eventId,
          data: {
            messageReference,
            senderId: 'senderId_that_does_not_exist',
            resourceId: 'resource-1234',
            nhsNumber: '9990548609',
            odsCode: 'A12345',
          },
        },
      ],
      messagePDMResourceAvailableValidator,
    );

    // Verify the event is processed and a message appears in the Lambda logs
    await expectToPassEventually(async () => {
      const filteredLogs = await getLogsFromCloudwatch(
        REPLACEWITH_COMPONENT_NAME_LAMBDA_LOG_GROUP_NAME,
        ['$.message.description  = "0 of 1 records processed successfully"'],
      );

      expect(filteredLogs.length).toBeGreaterThanOrEqual(1);
    }, 240);
    // Verify there is a message in the DLQ
    await expectMessageContainingString(REPLACEWITH_COMPONENT_NAME_DLQ_NAME, eventId, 420);
  });
});
