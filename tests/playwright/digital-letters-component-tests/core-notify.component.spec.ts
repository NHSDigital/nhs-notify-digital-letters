import { expect, test } from '@playwright/test';
import { CORE_NOTIFIER_DLQ_NAME } from 'constants/backend-constants';
import {
  SENDER_ID_SKIPS_NOTIFY,
  SENDER_ID_THAT_TRIGGERS_ERROR_IN_NOTIFY_SANDBOX,
  SENDER_ID_VALID_FOR_NOTIFY_SANDBOX,
} from 'constants/tests-constants';
import {
  PDMResourceAvailable,
  validatePDMResourceAvailable,
} from 'digital-letters-events';
import eventPublisher from 'helpers/event-bus-helpers';
import { expectMessageContainingString, purgeQueue } from 'helpers/sqs-helpers';
import { expectEventOnTestObserverQueue } from 'helpers/test-observer-helpers';
import { v4 as uuidv4 } from 'uuid';

const baseEvent: Omit<PDMResourceAvailable, 'id' | 'data'> = {
  specversion: '1.0',
  plane: 'data',
  dataschemaversion: '1.0.0',
  source: '/nhs/england/notify/production/primary/digitalletters/pdm',
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
    await purgeQueue(CORE_NOTIFIER_DLQ_NAME);
    test.setTimeout(250_000);
  });

  test.afterAll(async () => {
    await purgeQueue(CORE_NOTIFIER_DLQ_NAME);
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
            senderId: SENDER_ID_VALID_FOR_NOTIFY_SANDBOX,
            resourceId,
            nhsNumber: '9990548609',
            odsCode: 'A12345',
          },
        },
      ],
      validatePDMResourceAvailable,
    );

    const submittedDetail = await expectEventOnTestObserverQueue(
      'uk.nhs.notify.digital.letters.messages.request.submitted.v1',
      (d) => {
        const { data } = d as any;
        return (
          data.messageReference === messageReference &&
          data.senderId === SENDER_ID_VALID_FOR_NOTIFY_SANDBOX
        );
      },
      80_000,
    );
    const submittedData = (submittedDetail as any).data;
    expect(submittedData.notifyId).toBeTruthy();
    expect(submittedData.messageUri).toBe(
      `https://www.nhsapp.service.nhs.uk/digital-letters?letterid=${resourceId}`,
    );
  });

  test('given PDMResourceAvailable event with a client configured with a Routing plan not recognized by the Core Notify sandbox, when the sandbox receives the event then it replies with an error', async () => {
    const eventId = uuidv4();
    const messageReference = uuidv4();
    const resourceId = 'resource-999';

    await eventPublisher.sendEvents<PDMResourceAvailable>(
      [
        {
          ...baseEvent,
          id: eventId,
          data: {
            messageReference,
            senderId: SENDER_ID_THAT_TRIGGERS_ERROR_IN_NOTIFY_SANDBOX,
            resourceId,
            nhsNumber: '9434765919',
            odsCode: 'A12345',
          },
        },
      ],
      validatePDMResourceAvailable,
    );

    const rejectedDetail = await expectEventOnTestObserverQueue(
      'uk.nhs.notify.digital.letters.messages.request.rejected.v1',
      (d) => {
        const { data } = d as any;
        return (
          data.messageReference === messageReference &&
          data.senderId === SENDER_ID_THAT_TRIGGERS_ERROR_IN_NOTIFY_SANDBOX
        );
      },
      80_000,
    );
    const rejectedData = (rejectedDetail as any).data;
    expect(rejectedData.failureCode).toBe('CM_INVALID_VALUE');
    expect(rejectedData.messageUri).toBe(
      `https://www.nhsapp.service.nhs.uk/digital-letters?letterid=${resourceId}`,
    );
  });

  test('given PDMResourceAvailable event, when client does NOT have routingConfigId then a message is NOT sent to core Notify', async () => {
    const eventId = uuidv4();
    const messageReference = uuidv4();

    await eventPublisher.sendEvents<PDMResourceAvailable>(
      [
        {
          ...baseEvent,
          id: eventId,
          data: {
            messageReference,
            senderId: SENDER_ID_SKIPS_NOTIFY,
            resourceId: 'resource-7777',
            nhsNumber: '9990548609',
            odsCode: 'A12345',
          },
        },
      ],
      validatePDMResourceAvailable,
    );

    // Verify the event is published in the event bus
    await expectEventOnTestObserverQueue(
      'uk.nhs.notify.digital.letters.messages.request.skipped.v1',
      (d) => {
        const { data } = d as any;
        return (
          data.messageReference === messageReference &&
          data.senderId === SENDER_ID_SKIPS_NOTIFY
        );
      },
      80_000,
    );
  });

  test('given PDMResourceAvailable event, when client does NOT exist then it goes to DLQ', async () => {
    test.setTimeout(250_000);
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
      validatePDMResourceAvailable,
    );

    // Verify there is a message in the DLQ
    expectMessageContainingString(CORE_NOTIFIER_DLQ_NAME, eventId, 240);
  });
});
