import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from 'aws-lambda';
import { Logger, Sender } from 'utils';
import { PDMResourceAvailable } from 'digital-letters-events';
import {
  mapPdmEventToMessageRequestRejected,
  mapPdmEventToMessageRequestSkipped,
  mapPdmEventToMessageRequestSubmitted,
  mapPdmEventToSingleMessageRequest,
} from 'domain/mapper';
import { parseSqsRecord } from 'app/parse-sqs-message';

import type { NotifyMessageProcessor } from 'app/notify-message-processor';
import { SenderManagement } from 'sender-management';
import { EventPublisherFacade } from 'infra/event-publisher-facade';
import { RequestNotifyError } from 'domain/request-notify-error';

export interface SqsHandlerDependencies {
  notifyMessageProcessor: NotifyMessageProcessor;
  logger: Logger;
  senderManagement: typeof SenderManagement;
  eventPublisherFacade: EventPublisherFacade;
}

export const createHandler = ({
  eventPublisherFacade,
  logger,
  notifyMessageProcessor,
  senderManagement,
}: SqsHandlerDependencies) =>
  async function handler(sqsEvent: SQSEvent): Promise<SQSBatchResponse> {
    const receivedItemCount = sqsEvent.Records.length;

    logger.info(`Received SQS Event of ${receivedItemCount} record(s)`);

    const batchItemFailures: SQSBatchItemFailure[] = [];
    let incoming: PDMResourceAvailable;
    let sender: Sender;

    await Promise.all(
      sqsEvent.Records.map(async (sqsRecord: SQSRecord) => {
        try {
          incoming = parseSqsRecord(sqsRecord, logger);
          sender = senderManagement.getSender(incoming.data.senderId);

          if (sender.routingConfigId === undefined) {
            logger.debug(
              `No routing config for sender ${sender.senderId}, skipping message`,
            );
            eventPublisherFacade.publishMessageRequestSkipped(
              mapPdmEventToMessageRequestSkipped(incoming, sender),
            );
          } else {
            const request = mapPdmEventToSingleMessageRequest(
              incoming,
              senderManagement,
            );
            const notifyId = await notifyMessageProcessor.process(request);
            if (notifyId !== undefined) {
              eventPublisherFacade.publishMessageRequestSubmitted(
                mapPdmEventToMessageRequestSubmitted(
                  incoming,
                  sender,
                  notifyId,
                ),
              );
            }
          }
        } catch (error: any) {
          logger.warn({
            error: error.message,
            description: 'Failed processing message',
            messageId: sqsRecord.messageId,
          });
          if (
            error instanceof RequestNotifyError &&
            'messageReference' in error
          ) {
            // terminal error so we don't retry the message
            eventPublisherFacade.publishMessageRequestRejected(
              mapPdmEventToMessageRequestRejected(
                incoming,
                sender,
                error.errorCode,
              ),
            );
          } else {
            // this might be a transient error so we notify the queue to retry
            batchItemFailures.push({ itemIdentifier: sqsRecord.messageId });
          }
        }
      }),
    );

    const processedItemCount = receivedItemCount - batchItemFailures.length;
    logger.info(
      `${processedItemCount} of ${receivedItemCount} records processed successfully`,
    );

    return { batchItemFailures };
  };
