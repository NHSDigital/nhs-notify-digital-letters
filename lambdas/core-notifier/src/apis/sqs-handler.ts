import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from 'aws-lambda';
import { Logger, Sender } from 'utils';
import { PDMResourceAvailable } from 'digital-letters-events';
import { mapQueueToRequest } from 'domain/mapper';
import { parseSqsRecord } from 'app/parse-sqs-message';

import type { NotifyMessageProcessor } from 'app/notify-message-processor';
import { SenderManagement } from 'sender-management';

export interface SqsHandlerDependencies {
  notifyMessageProcessor: NotifyMessageProcessor;
  logger: Logger;
  senderManagement: SenderManagement;
}

export const createHandler = ({
  logger,
  notifyMessageProcessor,
  senderManagement,
}: SqsHandlerDependencies) =>
  async function handler(sqsEvent: SQSEvent): Promise<SQSBatchResponse> {
    const receivedItemCount = sqsEvent.Records.length;

    logger.info(`Received SQS Event of ${receivedItemCount} record(s)`);

    const batchItemFailures: SQSBatchItemFailure[] = [];

    await Promise.all(
      sqsEvent.Records.map(async (sqsRecord: SQSRecord) => {
        try {
          const incoming: PDMResourceAvailable = parseSqsRecord(
            sqsRecord,
            logger,
          );
          const sender: Sender = senderManagement.getSender(
            incoming.data.senderId,
          );

          const request = mapQueueToRequest(incoming, senderManagement);
          await notifyMessageProcessor.process(request);
        } catch (error: any) {
          logger.warn({
            error: error.message,
            description: 'Failed processing message',
            messageId: sqsRecord.messageId,
          });
          batchItemFailures.push({ itemIdentifier: sqsRecord.messageId });
        }
      }),
    );

    const processedItemCount = receivedItemCount - batchItemFailures.length;
    logger.info(
      `${processedItemCount} of ${receivedItemCount} records processed successfully`,
    );

    return { batchItemFailures };
  };
