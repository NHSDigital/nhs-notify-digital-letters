import { expect, test } from '@playwright/test';
import {
  ENV,
  MESH_DOWNLOAD_DLQ_NAME,
  MESH_POLL_LAMBDA_NAME,
  NON_PII_S3_BUCKET_NAME,
  PII_S3_BUCKET_NAME,
} from 'constants/backend-constants';
import { getLogsFromCloudwatch } from 'helpers/cloudwatch-helpers';
import eventPublisher from 'helpers/event-bus-helpers';
import expectToPassEventually from 'helpers/expectations';
import { invokeLambda } from 'helpers/lambda-helpers';
import { downloadFromS3, uploadToS3 } from 'helpers/s3-helpers';
import { expectMessageContainingString } from 'helpers/sqs-helpers';
import { v4 as uuidv4 } from 'uuid';
import messageMessageReceived from 'digital-letters-events/MESHInboxMessageReceived.js';
import { SENDER_ID_SKIPS_NOTIFY } from 'constants/tests-constants';

test.describe('Digital Letters - MESH Poll and Download', () => {
  const senderId = SENDER_ID_SKIPS_NOTIFY;
  const sendersMeshMailboxId = 'test-mesh-sender-1';
  const meshMailboxId = 'mock-mailbox';

  async function uploadMeshMessage(
    meshMessageId: string,
    messageReference: string,
    messageContent: string,
    metadata: Record<string, string> = {},
  ): Promise<void> {
    const key = `mock-mesh/${meshMailboxId}/in/${meshMessageId}`;
    const meshMetadata = {
      sender: sendersMeshMailboxId,
      subject: '201',
      workflow_id: 'NHS_NOTIFY_SEND_REQUEST',
      local_id: messageReference,
      ...metadata,
    };

    await uploadToS3(messageContent, NON_PII_S3_BUCKET_NAME, key, meshMetadata);
  }

  async function expectMeshInboxMessageReceivedEvent(
    meshMessageId: string,
  ): Promise<void> {
    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        `/aws/vendedlogs/events/event-bus/nhs-${ENV}-dl`,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.mesh.inbox.message.received.v1"',
          `$.details.event_detail = "*\\"meshMessageId\\":\\"${meshMessageId}\\"*"`,
          `$.details.event_detail = "*\\"senderId\\":\\"${senderId}\\"*"`,
        ],
      );

      expect(eventLogEntry.length).toBeGreaterThanOrEqual(1);
    }, 120_000);
  }

  async function expectMeshInboxMessageDownloadedEvent(
    messageReference: string,
  ): Promise<void> {
    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        `/aws/vendedlogs/events/event-bus/nhs-${ENV}-dl`,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1"',
          `$.details.event_detail = "*\\"messageReference\\":\\"${messageReference}\\"*"`,
          `$.details.event_detail = "*\\"senderId\\":\\"${senderId}\\"*"`,
        ],
      );

      expect(eventLogEntry.length).toBeGreaterThanOrEqual(1);
    }, 180_000);
  }

  test('should poll message from MESH inbox, publish received event, download message, and publish downloaded event', async () => {
    const meshMessageId = `${Date.now()}_TEST_${uuidv4().slice(0, 8)}`;
    const messageReference = uuidv4();
    const messageContent = JSON.stringify({
      senderId,
      messageReference,
      testData: 'This is a test letter content',
      timestamp: new Date().toISOString(),
    });

    await uploadMeshMessage(meshMessageId, messageReference, messageContent);

    await invokeLambda(MESH_POLL_LAMBDA_NAME);

    await expectMeshInboxMessageReceivedEvent(meshMessageId);
    await expectMeshInboxMessageDownloadedEvent(messageReference);

    await expectToPassEventually(async () => {
      const storedMessage = await downloadFromS3(
        PII_S3_BUCKET_NAME,
        `document-reference/${senderId}_${messageReference}`,
      );

      expect(storedMessage.body).toContain(messageContent);
    }, 60_000);

    await expectToPassEventually(async () => {
      await expect(async () => {
        await downloadFromS3(
          NON_PII_S3_BUCKET_NAME,
          `mock-mesh/${meshMailboxId}/in/${meshMessageId}`,
        );
      }).rejects.toThrow('No objects found');
    }, 60_000);
  });

  test('should send message to mesh-download DLQ when download fails', async () => {
    test.setTimeout(400_000);

    const invalidMeshMessageId = `${Date.now()}_DLQ_${uuidv4().slice(0, 8)}`;
    const messageReference = uuidv4();

    await eventPublisher.sendEvents(
      [
        {
          id: uuidv4(),
          specversion: '1.0',
          source:
            '/nhs/england/notify/development/primary/data-plane/digitalletters/mesh',
          subject:
            'customer/00000000-0000-0000-0000-000000000000/recipient/00000000-0000-0000-0000-000000000000',
          type: 'uk.nhs.notify.digital.letters.mesh.inbox.message.received.v1',
          time: '2026-01-20T15:48:21.636284+00:00',
          recordedtime: '2026-01-20T15:48:21.636284+00:00',
          severitynumber: 2,
          severitytext: 'INFO',
          traceparent:
            '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-mesh-inbox-message-received-data.schema.json',
          data: {
            meshMessageId: invalidMeshMessageId,
            senderId,
            messageReference,
          },
        },
      ],
      messageMessageReceived,
    );

    await expectMessageContainingString(
      MESH_DOWNLOAD_DLQ_NAME,
      invalidMeshMessageId,
      300,
    );
  });

  test('should handle multiple messages in inbox', async () => {
    test.setTimeout(300_000);

    const messages = Array.from({ length: 3 }, (_, i) => ({
      meshMessageId: `${Date.now()}_MULTI_${i}_${uuidv4().slice(0, 8)}`,
      messageReference: uuidv4(),
      messageContent: JSON.stringify({
        senderId,
        messageReference: uuidv4(),
        testData: `Test message ${i}`,
      }),
    }));

    for (const msg of messages) {
      await uploadMeshMessage(
        msg.meshMessageId,
        msg.messageReference,
        msg.messageContent,
      );
    }

    await invokeLambda(MESH_POLL_LAMBDA_NAME);

    for (const msg of messages) {
      await expectMeshInboxMessageReceivedEvent(msg.meshMessageId);
    }
  });
});
