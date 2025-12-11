import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from 'aws-lambda';
import { EventPublisher, Logger, Sender } from 'utils';
import {
  MessageRequestRejected,
  MessageRequestSkipped,
  MessageRequestSubmitted,
  PDMResourceAvailable,
} from 'digital-letters-events';
import {
  mapPdmEventToMessageRequestRejected,
  mapPdmEventToMessageRequestSkipped,
  mapPdmEventToMessageRequestSubmitted,
  mapPdmEventToSingleMessageRequest,
} from 'domain/mapper';
import messageRequestSubmittedValidator from 'digital-letters-events/MessageRequestSubmitted.js';
import messageRequestRejectedValidator from 'digital-letters-events/MessageRequestRejected.js';
import messageRequestSkippedValidator from 'digital-letters-events/MessageRequestSkipped.js';
import { parseSqsRecord } from 'app/parse-sqs-message';

import type { NotifyMessageProcessor } from 'app/notify-message-processor';
import { ISenderManagement } from 'sender-management';
import { RequestNotifyError } from 'domain/request-notify-error';

export interface SqsHandlerDependencies {
  logger: Logger;
  notifyMessageProcessor: NotifyMessageProcessor;
  senderManagement: ISenderManagement;
  eventPublisher: EventPublisher;
}

type EventToPublish = {
  skipped?: MessageRequestSkipped;
  submitted?: MessageRequestSubmitted;
  rejected?: MessageRequestRejected;
};

async function handlePdmResourceAvailable(
  notifyMessageProcessor: NotifyMessageProcessor,
  incoming: PDMResourceAvailable,
  sender: Sender | null,
): Promise<EventToPublish> {
  const eventToPublish = {} as EventToPublish;
  if (sender === null) {
    throw new Error(`Sender not found for senderId: ${incoming.data.senderId}`);
  }

  if (sender.routingConfigId === undefined) {
    const messageRequestSkipped = mapPdmEventToMessageRequestSkipped(
      incoming,
      sender,
    );
    eventToPublish.skipped = messageRequestSkipped;
  } else {
    const request = mapPdmEventToSingleMessageRequest(incoming, sender);
    const notifyId = await notifyMessageProcessor.process(
      request,
      incoming.data.senderId,
    );
    const messageRequestSubmitted = mapPdmEventToMessageRequestSubmitted(
      incoming,
      sender,
      notifyId,
    );
    eventToPublish.submitted = messageRequestSubmitted;
  }

  return eventToPublish;
}

export const createHandler = ({
  eventPublisher,
  logger,
  notifyMessageProcessor,
  senderManagement,
}: SqsHandlerDependencies) =>
  async function handler(sqsEvent: SQSEvent): Promise<SQSBatchResponse> {
    const receivedItemCount = sqsEvent.Records.length;

    logger.info({
      description: `Received SQS Event of ${receivedItemCount} record(s)`,
    });

    const batchItemFailures: SQSBatchItemFailure[] = [];
    const skippedEvents: MessageRequestSkipped[] = [];
    const submittedEvents: MessageRequestSubmitted[] = [];
    const rejectedEvents: MessageRequestRejected[] = [];

    let incoming: PDMResourceAvailable;
    let sender: Sender | null;

    await Promise.all(
      sqsEvent.Records.map(async (sqsRecord: SQSRecord) => {
        try {
          incoming = parseSqsRecord(sqsRecord, logger);
          sender = await senderManagement.getSender({
            senderId: incoming.data.senderId,
          });
          const eventToPublish = await handlePdmResourceAvailable(
            notifyMessageProcessor,
            incoming,
            sender,
          );

          if (eventToPublish.submitted) {
            submittedEvents.push(eventToPublish.submitted);
          }
          if (eventToPublish.skipped) {
            skippedEvents.push(eventToPublish.skipped);
          }
        } catch (error: any) {
          logger.warn({
            error: error.message,
            description: 'Failed processing message',
            messageId: sqsRecord.messageId,
            senderId: incoming?.data.senderId,
          });
          if (error instanceof RequestNotifyError) {
            // CCM-12858 A/C 5: When any other response other than a 201 is returned, don't retry the message
            rejectedEvents.push(
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

    await Promise.all(
      [
        submittedEvents.length > 0 &&
          eventPublisher.sendEvents<MessageRequestSubmitted>(
            submittedEvents,
            messageRequestSubmittedValidator,
          ),
        skippedEvents.length > 0 &&
          eventPublisher.sendEvents<MessageRequestSkipped>(
            skippedEvents,
            messageRequestSkippedValidator,
          ),
        rejectedEvents.length > 0 &&
          eventPublisher.sendEvents<MessageRequestRejected>(
            rejectedEvents,
            messageRequestRejectedValidator,
          ),
      ].filter(Boolean),
    );

    const processedItemCount = receivedItemCount - batchItemFailures.length;

    logger.info({
      description: `${processedItemCount} of ${receivedItemCount} records processed successfully`,
    });

    return { batchItemFailures };
  };
