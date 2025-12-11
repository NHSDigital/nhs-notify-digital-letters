import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from 'aws-lambda';
import { Logger } from 'utils';
// import { SenderManagement } from 'sender-management';
import { mapQueueToRequest } from 'domain/mapper';
import { parseSqsRecord } from 'app/parse-sqs-message';

import type { NotifyMessageProcessor } from 'app/notify-message-processor';
import { SenderRepository } from 'sender-management/src/infra/sender-repository/repository';

export interface SqsHandlerDependencies {
  notifyMessageProcessor: NotifyMessageProcessor;
  logger: Logger;
  senderRepository: SenderRepository;
}

export const createHandler = ({
  notifyMessageProcessor,
  logger,
  senderRepository,
}: SqsHandlerDependencies) =>
  async function handler(sqsEvent: SQSEvent): Promise<SQSBatchResponse> {
    const receivedItemCount = sqsEvent.Records.length;

    logger.info(`Received SQS Event of ${receivedItemCount} record(s)`);

    const batchItemFailures: SQSBatchItemFailure[] = [];

    await Promise.all(
      sqsEvent.Records.map(async (sqsRecord: SQSRecord) => {
        try {
          const incoming = parseSqsRecord(sqsRecord, logger);
          const request = mapQueueToRequest(incoming, senderRepository);
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
