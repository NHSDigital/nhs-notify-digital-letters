import { expect, test } from '@playwright/test';
import {
  EVENT_BUS_LOG_GROUP_NAME,
  PDM_POLL_DLQ_NAME,
  PDM_POLL_LAMBDA_LOG_GROUP_NAME,
} from 'constants/backend-constants';
import pdmResourceSubmittedValidator from 'digital-letters-events/PDMResourceSubmitted.js';
import pdmResourceUnavailableValidator from 'digital-letters-events/PDMResourceUnavailable.js';
import { getLogsFromCloudwatch } from 'helpers/cloudwatch-helpers';
import eventPublisher from 'helpers/event-bus-helpers';
import expectToPassEventually from 'helpers/expectations';
import { expectMessageContainingString } from 'helpers/sqs-helpers';
import { v4 as uuidv4 } from 'uuid';

const baseEvent = {
  profileversion: '1.0.0',
  profilepublished: '2025-10',
  specversion: '1.0',
  source:
    '/nhs/england/notify/production/primary/data-plane/digitalletters/pdm',
  subject:
    'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
  type: 'uk.nhs.notify.digital.letters.pdm.resource.submitted.v1',
  time: '2023-06-20T12:00:00Z',
  recordedtime: '2023-06-20T12:00:00.250Z',
  severitynumber: 2,
  traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
  datacontenttype: 'application/json',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-submitted-data.schema.json',
  dataschemaversion: '1.0',
  severitytext: 'INFO',
};

test.describe('PDM Poll', () => {
  test.beforeAll(async () => {
    test.setTimeout(250_000);
  });

  test('should send a pdm.resource.available event when available in PDM', async () => {
    const eventId = uuidv4();
    const documentResourceId = '9ae75410-c067-35ae-9410-153fa849a4dd';
    const messageReference = uuidv4();
    const senderId = uuidv4();

    await eventPublisher.sendEvents(
      [
        {
          ...baseEvent,
          id: eventId,
          data: {
            resourceId: documentResourceId,
            messageReference,
            senderId,
          },
        },
      ],
      pdmResourceSubmittedValidator,
    );

    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        EVENT_BUS_LOG_GROUP_NAME,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.pdm.resource.available.v1"',
          `$.details.event_detail = "*\\"messageReference\\":\\"${messageReference}\\"*"`,
          `$.details.event_detail = "*\\"odsCode\\":\\"Y05868\\"*"`,
          `$.details.event_detail = "*\\"nhsNumber\\":\\"9912003071\\"*"`,
        ],
      );

      expect(eventLogEntry.length).toEqual(1);
    }, 120);
  });

  test('should send a pdm.resource.unavailable event when not available in PDM', async () => {
    const eventId = uuidv4();
    const documentResourceId = 'b8f2b194-31e1-3719-aaf9-a9195e35e692';
    const messageReference = uuidv4();
    const senderId = uuidv4();

    await eventPublisher.sendEvents(
      [
        {
          ...baseEvent,
          id: eventId,
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-unavailable-data.schema.json',
          type: 'uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1',
          data: {
            resourceId: documentResourceId,
            messageReference,
            senderId,
            retryCount: 0,
          },
        },
      ],
      pdmResourceUnavailableValidator,
    );

    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        EVENT_BUS_LOG_GROUP_NAME,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1"',
          `$.details.event_detail = "*\\"messageReference\\":\\"${messageReference}\\"*"`,
          `$.details.event_detail = "*\\"retryCount\\":1*"`,
        ],
      );

      expect(eventLogEntry.length).toEqual(1);
    }, 120);
  });

  test('should send a pdm.resource.retries.exceeded event when not available in PDM after 10 retries', async () => {
    const eventId = uuidv4();
    const documentResourceId = 'b8f2b194-31e1-3719-aaf9-a9195e35e692';
    const messageReference = uuidv4();
    const senderId = uuidv4();

    await eventPublisher.sendEvents(
      [
        {
          ...baseEvent,
          id: eventId,
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-unavailable-data.schema.json',
          type: 'uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1',
          data: {
            resourceId: documentResourceId,
            messageReference,
            senderId,
            retryCount: 9,
          },
        },
      ],
      pdmResourceUnavailableValidator,
    );

    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        EVENT_BUS_LOG_GROUP_NAME,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.pdm.resource.retries.exceeded.v1"',
          `$.details.event_detail = "*\\"messageReference\\":\\"${messageReference}\\"*"`,
          `$.details.event_detail = "*\\"retryCount\\":10*"`,
        ],
      );

      expect(eventLogEntry.length).toEqual(1);
    }, 120);
  });

  test('should send invalid event to poll dlq', async () => {
    // Sadly it takes longer than expected to go through the 3 retries before it's sent to the DLQ.
    test.setTimeout(550_000);

    const eventId = uuidv4();
    const documentResourceId = 'b8f2b194-31e1-3719-aaf9-a9195e35e692';
    const messageReference = uuidv4();
    const senderId = uuidv4();

    // Send pdm.resource.unavailable event with no retryCount
    await eventPublisher.sendEvents(
      [
        {
          ...baseEvent,
          id: eventId,
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-unavailable-data.schema.json',
          type: 'uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1',
          data: {
            resourceId: documentResourceId,
            messageReference,
            senderId,
          },
        },
      ],
      () => true,
    );

    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        PDM_POLL_LAMBDA_LOG_GROUP_NAME,
        [
          `$.message.err[0].message = "must have required property 'retryCount'"`,
        ],
      );

      expect(eventLogEntry.length).toEqual(1);
    }, 120);

    await expectMessageContainingString(PDM_POLL_DLQ_NAME, eventId, 420);
  });
});
