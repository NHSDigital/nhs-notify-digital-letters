import { expect, test } from '@playwright/test';
import {
  CORE_NOTIFIER_DLQ_NAME,
  CORE_NOTIFIER_LAMBDA_LOG_GROUP_NAME,
  CSI,
  EVENT_BUS_LOG_GROUP_NAME,
} from 'constants/backend-constants';
import { PDMResourceAvailable } from 'digital-letters-events';
import messagePDMResourceAvailableValidator from 'digital-letters-events/PDMResourceAvailable.js';
import { getLogsFromCloudwatch } from 'helpers/cloudwatch-helpers';
import eventPublisher from 'helpers/event-bus-helpers';
import expectToPassEventually from 'helpers/expectations';
import { expectMessageContainingString, purgeQueue } from 'helpers/sqs-helpers';
import { SenderManagement } from 'sender-management';
import { v4 as uuidv4 } from 'uuid';
import { ParameterStoreCache } from 'utils';

const senderIdInvokingNotify = 'componentTestSender_RoutingConfig';
const senderIdInvokingNotifyRoutingInvalid =
  'componentTestSender_RoutingConfigInvalid';
const senderIdThatSkipsNotify = 'componentTestSender_NoRoutingConfig';

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
  const handleCoreNotifierDlqName = `${CSI}-core-notifier-errors-queue`;
  const parameterStore = new ParameterStoreCache();
  const senderManagement = SenderManagement({
    parameterStore,
  });

  async function deleteSendersIfExist() {
    senderManagement.deleteSender({ senderId: senderIdInvokingNotify });
    senderManagement.deleteSender({
      senderId: senderIdInvokingNotifyRoutingInvalid,
    });
    senderManagement.deleteSender({ senderId: senderIdThatSkipsNotify });
  }

  test.beforeAll(async () => {
    await purgeQueue(handleCoreNotifierDlqName);
    await purgeQueue(CORE_NOTIFIER_DLQ_NAME);
    test.setTimeout(250_000);

    await deleteSendersIfExist();
    senderManagement.putSender({
      senderId: senderIdInvokingNotify,
      senderName: 'componentTestSender_RoutingConfig',
      meshMailboxSenderId: 'meshMailboxSender1',
      meshMailboxReportsId: 'meshMailboxReports1',
      routingConfigId: 'b838b13c-f98c-4def-93f0-515d4e4f4ee1',
      fallbackWaitTimeSeconds: 100,
    });

    senderManagement.putSender({
      senderId: senderIdInvokingNotifyRoutingInvalid,
      senderName: 'componentTestSender_RoutingConfig',
      meshMailboxSenderId: 'meshMailboxSender2',
      meshMailboxReportsId: 'meshMailboxReports2',
      routingConfigId: 'invalid',
      fallbackWaitTimeSeconds: 100,
    });

    senderManagement.putSender({
      senderId: senderIdThatSkipsNotify,
      senderName: 'componentTestSender_WithoutRoutingConfig',
      meshMailboxSenderId: 'meshMailboxSender3',
      meshMailboxReportsId: 'meshMailboxReports3',
      fallbackWaitTimeSeconds: 100,
    });
  });

  test.afterAll(async () => {
    await purgeQueue(handleCoreNotifierDlqName);
    await purgeQueue(CORE_NOTIFIER_DLQ_NAME);
    await deleteSendersIfExist();
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
            senderId: senderIdInvokingNotify,
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
        CORE_NOTIFIER_LAMBDA_LOG_GROUP_NAME,
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
          `$.details.event_detail = "*\\"notifyId\\":\\"*\\"*"`,
          `$.details.event_detail = "*\\"messageUri\\":\\"https://www.nhsapp.service.nhs.uk/digital-letters?letterid=${resourceId}\\"*"`,
          `$.details.event_detail = "*\\"messageReference\\":\\"${messageReference}\\"*"`,
        ],
      );

      expect(eventLogEntry.length).toEqual(1);
    }, 240);
  });

  test('given PDMResourceAvailable event with INVALID Routing plan for the Sandbox, when client has routingConfigId then a message is sent to core Notify', async () => {
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
            senderId: senderIdInvokingNotifyRoutingInvalid,
            resourceId,
            nhsNumber: '9434765919',
            odsCode: 'A12345',
          },
        },
      ],
      messagePDMResourceAvailableValidator,
    );

    // Verify the event is processed and a message appears in the Lambda logs
    await expectToPassEventually(async () => {
      const filteredLogs = await getLogsFromCloudwatch(
        CORE_NOTIFIER_LAMBDA_LOG_GROUP_NAME,
        [
          '$.message.description  = "Failed sending request to Notify API"',
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
          '$.details.detail_type = "uk.nhs.notify.digital.letters.messages.request.rejected.v1"',
          `$.details.event_detail = "*\\"failureCode\\":\\"CM_INVALID_VALUE\\"*"`,
          `$.details.event_detail = "*\\"messageUri\\":\\"https://www.nhsapp.service.nhs.uk/digital-letters?letterid=${resourceId}\\"*"`,
          `$.details.event_detail = "*\\"messageReference\\":\\"${messageReference}\\"*"`,
        ],
      );

      expect(eventLogEntry.length).toEqual(1);
    }, 240);
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
            senderId: senderIdThatSkipsNotify,
            resourceId: 'resource-7777',
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
        CORE_NOTIFIER_LAMBDA_LOG_GROUP_NAME,
        ['$.message.description  = "1 of 1 records processed successfully"'],
      );

      expect(filteredLogs.length).toBeGreaterThanOrEqual(1);
    }, 240);

    // Verify the event is published in the event bus
    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        EVENT_BUS_LOG_GROUP_NAME,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.messages.request.skipped.v1"',
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
        CORE_NOTIFIER_LAMBDA_LOG_GROUP_NAME,
        ['$.message.description  = "0 of 1 records processed successfully"'],
      );

      expect(filteredLogs.length).toBeGreaterThanOrEqual(1);
    }, 240);
    // Verify there is a message in the DLQ
    await expectMessageContainingString(CORE_NOTIFIER_DLQ_NAME, eventId, 420);
  });
});
