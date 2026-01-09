import { expect, test } from '@playwright/test';
import {
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
const senderIdThatSkipsNotify = 'componentTestSender_NoRoutingConfig';

test.describe('Digital Letters - Core Notify', () => {
  const handleCoreNotifierDlqName = `${CSI}-core-notifier-errors-queue`;
  const parameterStore = new ParameterStoreCache();
  const senderManagement = SenderManagement({
    parameterStore,
  });

  async function deleteSendersIfExist() {
    senderManagement.deleteSender({ senderId: senderIdInvokingNotify });
    senderManagement.deleteSender({ senderId: senderIdThatSkipsNotify });
  }

  test.beforeAll(async () => {
    await purgeQueue(handleCoreNotifierDlqName);
    await deleteSendersIfExist();
    senderManagement.putSender({
      senderId: senderIdInvokingNotify,
      senderName: 'componentTestSender_RoutingConfig',
      meshMailboxSenderId: 'meshMailboxSender1',
      meshMailboxReportsId: 'meshMailboxReports1',
      routingConfigId: 'routing-config-1',
      fallbackWaitTimeSeconds: 100,
    });

    senderManagement.putSender({
      senderId: senderIdThatSkipsNotify,
      senderName: 'componentTestSender_WithoutRoutingConfig',
      meshMailboxSenderId: 'meshMailboxSender2',
      meshMailboxReportsId: 'meshMailboxReports2',
      fallbackWaitTimeSeconds: 100,
    });
  });

  test.afterAll(async () => {
    await purgeQueue(handleCoreNotifierDlqName);
    await deleteSendersIfExist();
  });

  test('given PDMResourceAvailable event, when client has routingConfigId then a message is sent to core Notify', async () => {
    const letterId = uuidv4();
    const messageReference = uuidv4();

    await eventPublisher.sendEvents<PDMResourceAvailable>(
      [
        {
          id: letterId,
          specversion: '1.0',
          source:
            '/nhs/england/notify/production/primary/data-plane/digitalletters/pdm',
          subject:
            'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
          type: 'uk.nhs.notify.digital.letters.pdm.resource.available.v1',
          time: '2023-06-20T12:00:00Z',
          recordedtime: '2023-06-20T12:00:00.250Z',
          severitynumber: 2,
          traceparent:
            '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
          datacontenttype: 'application/json',
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-available-data.schema.json',
          severitytext: 'INFO',
          data: {
            messageReference: messageReference,
            senderId: senderIdInvokingNotify,
            resourceId: 'resource-123',
            nhsNumber: '9991234566',
            odsCode: 'A12345',
          },
        },
      ],
      messagePDMResourceAvailableValidator,
    );

    // Verify the event is processed.
    await expectToPassEventually(async () => {
      const filteredLogs = await getLogsFromCloudwatch(
        CORE_NOTIFIER_LAMBDA_LOG_GROUP_NAME,
        ['$.message.description  = "Successfully processed request and sent to Notify"'],
      );

      expect(filteredLogs.length).toEqual(1);
    }, 120);

    await expectToPassEventually(async () => {
      const filteredLogs = await getLogsFromCloudwatch(
        CORE_NOTIFIER_LAMBDA_LOG_GROUP_NAME,
        ['$.message.description  = "Publishing MessageRequestSubmitted event"',
          `$.message.messageReference  = "${messageReference}"`,
          `$.message.senderId  = "${senderIdInvokingNotify}"`,
        ],
      );

      expect(filteredLogs.length).toEqual(1);
    }, 120);

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
    }, 120);
  });
  // create following tests
  test('given PDMResourceAvailable event, when client does NOT have routingConfigId then a message is NOT sent to core Notify', async () => {
    const letterId = uuidv4();
    const messageReference = uuidv4();

    await eventPublisher.sendEvents<PDMResourceAvailable>(
      [
        {
          id: letterId,
          specversion: '1.0',
          source:
            '/nhs/england/notify/production/primary/data-plane/digitalletters/pdm',
          subject:
            'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
          type: 'uk.nhs.notify.digital.letters.pdm.resource.available.v1',
          time: '2023-06-20T12:00:00Z',
          recordedtime: '2023-06-20T12:00:00.250Z',
          severitynumber: 2,
          traceparent:
            '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
          datacontenttype: 'application/json',
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-available-data.schema.json',
          severitytext: 'INFO',
          data: {
            messageReference: messageReference,
            senderId: senderIdThatSkipsNotify,
            resourceId: 'resource-1234',
            nhsNumber: '9991234566',
            odsCode: 'A12345',
          },
        },
      ],
      messagePDMResourceAvailableValidator,
    );

    // Verify the event is processed.
    await expectToPassEventually(async () => {
      const filteredLogs = await getLogsFromCloudwatch(
        CORE_NOTIFIER_LAMBDA_LOG_GROUP_NAME,
        ['$.message.description  = "1 of 1 records processed successfully"'],
      );

      expect(filteredLogs.length).toBeGreaterThanOrEqual(1);
    }, 120);
    await expectToPassEventually(async () => {
      const filteredLogs = await getLogsFromCloudwatch(
        CORE_NOTIFIER_LAMBDA_LOG_GROUP_NAME,
        ['$.message.description  = "Publishing MessageRequestSkipped event"',
          `$.message.messageReference  = "${messageReference}"`,
          `$.message.senderId  = "${senderIdThatSkipsNotify}"`,
        ],
      );

      expect(filteredLogs.length).toEqual(1);
    }, 120);

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
    }, 120);
  });
  // when fails repeatedly then goes to DLQ
});
