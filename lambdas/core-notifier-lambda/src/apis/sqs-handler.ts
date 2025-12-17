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
import { ISenderManagement } from 'sender-management';
import { EventPublisherFacade } from 'infra/event-publisher-facade';
import { RequestNotifyError } from 'domain/request-notify-error';

export interface SqsHandlerDependencies {
  logger: Logger;
  notifyMessageProcessor: NotifyMessageProcessor;
  senderManagement: ISenderManagement;
  eventPublisherFacade: EventPublisherFacade;
}

async function handlePdmResourceAvailable(
  eventPublisherFacade: EventPublisherFacade,
  notifyMessageProcessor: NotifyMessageProcessor,
  incoming: PDMResourceAvailable,
  sender: Sender | null,
): Promise<void> {
  if (sender === null) {
    throw new Error(`Sender not found for senderId: ${incoming.data.senderId}`);
  }

  if (sender.routingConfigId === undefined) {
    const messageRequestSkipped = mapPdmEventToMessageRequestSkipped(
      incoming,
      sender,
    );
    eventPublisherFacade.publishMessageRequestSkipped(messageRequestSkipped);
  } else {
    const request = mapPdmEventToSingleMessageRequest(incoming, sender);
    const notifyId = await notifyMessageProcessor.process(request);
    const messageRequestSubmitted = mapPdmEventToMessageRequestSubmitted(
      incoming,
      sender,
      notifyId,
    );
    eventPublisherFacade.publishMessageRequestSubmitted(
      messageRequestSubmitted,
    );
  }
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
    let sender: Sender | null;

    await Promise.all(
      sqsEvent.Records.map(async (sqsRecord: SQSRecord) => {
        try {
          incoming = parseSqsRecord(sqsRecord, logger);
          sender = await senderManagement.getSender({
            senderId: incoming.data.senderId,
          });
          await handlePdmResourceAvailable(
            eventPublisherFacade,
            notifyMessageProcessor,
            incoming,
            sender,
          );
        } catch (error: any) {
          logger.warn({
            error: error.message,
            description: 'Failed processing message',
            messageId: sqsRecord.messageId,
          });
          if (error instanceof RequestNotifyError) {
            // terminal error so we don't retry the message
            eventPublisherFacade.publishMessageRequestRejected(
              mapPdmEventToMessageRequestRejected(
                incoming,
                sender!,
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
