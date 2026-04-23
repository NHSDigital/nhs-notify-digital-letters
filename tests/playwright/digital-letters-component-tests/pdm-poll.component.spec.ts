import { expect, test } from '@playwright/test';
import { PDM_POLL_DLQ_NAME } from 'constants/backend-constants';
import {
  validatePDMResourceSubmitted,
  validatePDMResourceUnavailable,
} from 'digital-letters-events';
import eventPublisher from 'helpers/event-bus-helpers';
import { expectMessageContainingString, purgeQueue } from 'helpers/sqs-helpers';
import { expectEventOnTestObserverQueue } from 'helpers/test-observer-helpers';
import { v4 as uuidv4 } from 'uuid';

const baseEvent = {
  specversion: '1.0',
  plane: 'data',
  dataschemaversion: '1.0.0',
  source: '/nhs/england/notify/production/primary/digitalletters/pdm',
  subject:
    'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
  time: '2023-06-20T12:00:00Z',
  recordedtime: '2023-06-20T12:00:00.250Z',
  severitynumber: 2,
  traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
  datacontenttype: 'application/json',
  severitytext: 'INFO',
};

const submittedEvent = {
  ...baseEvent,
  type: 'uk.nhs.notify.digital.letters.pdm.resource.submitted.v1',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-submitted-data.schema.json',
};

const unavailableEvent = {
  ...baseEvent,
  type: 'uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-unavailable-data.schema.json',
};

test.describe('PDM Poll', () => {
  test.beforeAll(async () => {
    test.setTimeout(250_000);
    await purgeQueue(PDM_POLL_DLQ_NAME);
  });

  test.describe('pdm.resource.submitted', () => {
    test('should send a pdm.resource.available event when available in PDM', async () => {
      const eventId = uuidv4();
      const resourceId = '9ae75410-c067-35ae-9410-153fa849a4dd';
      const messageReference = uuidv4();
      const senderId = uuidv4();

      await eventPublisher.sendEvents(
        [
          {
            ...submittedEvent,
            id: eventId,
            data: {
              resourceId,
              messageReference,
              senderId,
            },
          },
        ],
        validatePDMResourceSubmitted,
      );

      const availableDetail = await expectEventOnTestObserverQueue(
        'uk.nhs.notify.digital.letters.pdm.resource.available.v1',
        (d) => (d as any).data.messageReference === messageReference,
        60_000,
      );
      expect((availableDetail as any).data.odsCode).toBe('Y05868');
      expect((availableDetail as any).data.nhsNumber).toBe('9912003071');
    });

    test('should send a pdm.resource.unavailable event when unavailable in PDM', async () => {
      const eventId = uuidv4();
      const resourceId = 'unavailable-response';
      const messageReference = uuidv4();
      const senderId = uuidv4();

      await eventPublisher.sendEvents(
        [
          {
            ...submittedEvent,
            id: eventId,
            data: {
              resourceId,
              messageReference,
              senderId,
            },
          },
        ],
        validatePDMResourceSubmitted,
      );

      const unavailableDetail = await expectEventOnTestObserverQueue(
        'uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1',
        (d) => (d as any).data.messageReference === messageReference,
        60_000,
      );
      expect((unavailableDetail as any).data.retryCount).toBe(0);
    });
  });

  test.describe('pdm.resource.unavailable', () => {
    test('should send a pdm.resource.available event when an unavailable resource becomes available in PDM', async () => {
      const eventId = uuidv4();
      const resourceId = uuidv4();
      const messageReference = uuidv4();
      const senderId = uuidv4();

      await eventPublisher.sendEvents(
        [
          {
            ...unavailableEvent,
            id: eventId,
            data: {
              resourceId,
              messageReference,
              senderId,
              retryCount: 0,
            },
          },
        ],
        validatePDMResourceUnavailable,
      );

      const availableDetail2 = await expectEventOnTestObserverQueue(
        'uk.nhs.notify.digital.letters.pdm.resource.available.v1',
        (d) => (d as any).data.messageReference === messageReference,
        60_000,
      );
      expect((availableDetail2 as any).data.odsCode).toBe('Y05868');
      expect((availableDetail2 as any).data.nhsNumber).toBe('9912003071');
    });

    test('should send a pdm.resource.unavailable event when still unavailable in PDM', async () => {
      const eventId = uuidv4();
      const resourceId = 'unavailable-response';
      const messageReference = uuidv4();
      const senderId = uuidv4();

      await eventPublisher.sendEvents(
        [
          {
            ...unavailableEvent,
            id: eventId,
            data: {
              resourceId,
              messageReference,
              senderId,
              retryCount: 0,
            },
          },
        ],
        validatePDMResourceUnavailable,
      );

      const unavailableDetail2 = await expectEventOnTestObserverQueue(
        'uk.nhs.notify.digital.letters.pdm.resource.unavailable.v1',
        (d) => {
          const { data } = d as any;
          return (
            data.messageReference === messageReference && data.retryCount === 1
          );
        },
        60_000,
      );
      expect((unavailableDetail2 as any).data.retryCount).toBe(1);
    });

    test('should send a pdm.resource.retries.exceeded event when unavailable in PDM after 10 retries', async () => {
      const eventId = uuidv4();
      const resourceId = 'unavailable-response';
      const messageReference = uuidv4();
      const senderId = uuidv4();

      await eventPublisher.sendEvents(
        [
          {
            ...unavailableEvent,
            id: eventId,
            data: {
              resourceId,
              messageReference,
              senderId,
              retryCount: 9,
            },
          },
        ],
        validatePDMResourceUnavailable,
      );

      const exceededDetail = await expectEventOnTestObserverQueue(
        'uk.nhs.notify.digital.letters.pdm.resource.retries.exceeded.v1',
        (d) => (d as any).data.messageReference === messageReference,
        60_000,
      );
      expect((exceededDetail as any).data.retryCount).toBe(10);
    });
  });

  test('should send invalid event to poll dlq', async () => {
    test.setTimeout(160_000);

    const eventId = uuidv4();
    const resourceId = 'b8f2b194-31e1-3719-aaf9-a9195e35e692';
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
            resourceId,
            messageReference,
            senderId,
          },
        },
      ],
      () => true,
    );

    expectMessageContainingString(PDM_POLL_DLQ_NAME, eventId, 150);
  });
});
