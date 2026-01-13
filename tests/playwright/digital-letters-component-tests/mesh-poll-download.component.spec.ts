import { expect, test } from '@playwright/test';
import {
  ENV,
  MESH_DOWNLOAD_DLQ_NAME,
  MESH_POLL_DLQ_NAME,
  MESH_POLL_LAMBDA_NAME,
  NON_PII_S3_BUCKET_NAME,
} from 'constants/backend-constants';
import { getLogsFromCloudwatch } from 'helpers/cloudwatch-helpers';
import expectToPassEventually from 'helpers/expectations';
import { invokeLambda } from 'helpers/lambda-helpers';
import { downloadFromS3, uploadToS3 } from 'helpers/s3-helpers';
import { expectMessageContainingString } from 'helpers/sqs-helpers';
import { v4 as uuidv4 } from 'uuid';

test.describe('Digital Letters - MESH Poll and Download', () => {
  const senderId = 'test-sender-1';
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
      mex_from: sendersMeshMailboxId,
      mex_to: meshMailboxId,
      mex_workflowid: 'NHS_NOTIFY_SEND_REQUEST',
      mex_messageid: meshMessageId,
      mex_localid: messageReference,
      mex_subject: '201',
      mex_contenttype: 'application/json',
      ...metadata,
    };

    await uploadToS3(messageContent, NON_PII_S3_BUCKET_NAME, key, meshMetadata);
  }

  async function uploadMeshMessageWithSender(
    meshMessageId: string,
    messageReference: string,
    messageContent: string,
    senderMailboxId: string,
  ): Promise<void> {
    const key = `mock-mesh/${meshMailboxId}/in/${meshMessageId}`;
    const meshMetadata = {
      mex_from: senderMailboxId,
      mex_to: meshMailboxId,
      mex_workflowid: 'NHS_NOTIFY_SEND_REQUEST',
      mex_messageid: meshMessageId,
      mex_localid: messageReference,
      mex_subject: '201',
      mex_contenttype: 'application/json',
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
    meshMessageId: string,
    messageReference: string,
  ): Promise<void> {
    await expectToPassEventually(async () => {
      const eventLogEntry = await getLogsFromCloudwatch(
        `/aws/vendedlogs/events/event-bus/nhs-${ENV}-dl`,
        [
          '$.message_type = "EVENT_RECEIPT"',
          '$.details.detail_type = "uk.nhs.notify.digital.letters.mesh.inbox.message.downloaded.v1"',
          `$.details.event_detail = "*\\"meshMessageId\\":\\"${meshMessageId}\\"*"`,
          `$.details.event_detail = "*\\"messageReference\\":\\"${messageReference}\\"*"`,
          `$.details.event_detail = "*\\"senderId\\":\\"${senderId}\\"*"`,
        ],
      );

      expect(eventLogEntry.length).toBeGreaterThanOrEqual(1);
    }, 180_000);
  }

  test('should poll message from MESH inbox, publish received event, download message, and publish downloaded event', async () => {
    const meshMessageId = `${Date.now()}_TEST_${uuidv4().substring(0, 8)}`;
    const messageReference = uuidv4();
    const messageContent = JSON.stringify({
      senderId,
      messageReference,
      testData: 'This is a test letter content',
      timestamp: new Date().toISOString(),
    });

    await uploadMeshMessage(
      meshMessageId,
      messageReference,
      messageContent,
    );

    await invokeLambda(MESH_POLL_LAMBDA_NAME);

    await expectMeshInboxMessageReceivedEvent(meshMessageId);
    await expectMeshInboxMessageDownloadedEvent(meshMessageId, messageReference);

    await expectToPassEventually(async () => {
      const storedMessage = await downloadFromS3(
        NON_PII_S3_BUCKET_NAME,
        `mesh-downloads/${senderId}/${messageReference}`,
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

  test('should handle invalid sender and send to DLQ', async () => {
    test.setTimeout(300_000);

    const meshMessageId = `${Date.now()}_INVALID_${uuidv4().substring(0, 8)}`;
    const messageReference = uuidv4();
    const messageContent = JSON.stringify({
      senderId: 'unknown-sender',
      messageReference,
      testData: 'This should fail validation',
    });

    await uploadMeshMessageWithSender(
      meshMessageId,
      messageReference,
      messageContent,
      'unknown-mesh-sender',
    );

    await invokeLambda(MESH_POLL_LAMBDA_NAME);

    await expectMessageContainingString(
      MESH_POLL_DLQ_NAME,
      meshMessageId,
      240,
    );
  });

  test('should send message to mesh-download DLQ when download fails', async () => {
    test.setTimeout(400_000);

    const meshMessageId = `${Date.now()}_DLQ_${uuidv4().substring(0, 8)}`;
    const messageReference = uuidv4();
    const invalidMessageUri = 'https://example.com/invalid/nonexistent-resource';

    await uploadMeshMessage(
      meshMessageId,
      messageReference,
      JSON.stringify({
        senderId,
        messageReference,
        messageUri: invalidMessageUri,
        testData: 'This message has an invalid URI',
      }),
    );

    await invokeLambda(MESH_POLL_LAMBDA_NAME);

    await expectMeshInboxMessageReceivedEvent(meshMessageId);

    await expectMessageContainingString(
      MESH_DOWNLOAD_DLQ_NAME,
      meshMessageId,
      300,
    );
  });

  test('should handle multiple messages in inbox', async () => {
    test.setTimeout(300_000);

    const messages = Array.from({ length: 3 }, (_, i) => ({
      meshMessageId: `${Date.now()}_MULTI_${i}_${uuidv4().substring(0, 8)}`,
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
