import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from 'aws-lambda';
import { EventPublisher, Logger } from 'utils';
import {
  MessageRequestRejected,
  MessageRequestSkipped,
  MessageRequestSubmitted,
  PDMResourceAvailable,
} from 'digital-letters-events';
import {
  mapPdmEventToMessageRequestRejected,
  mapPdmEventToMessageRequestSubmitted,
  mapPdmEventToSingleMessageRequest,
} from 'domain/mapper';
import messageRequestSubmittedValidator from 'digital-letters-events/MessageRequestSubmitted.js';
import messageRequestRejectedValidator from 'digital-letters-events/MessageRequestRejected.js';
import messageRequestSkippedValidator from 'digital-letters-events/MessageRequestSkipped.js';
import { parseSqsRecord } from 'app/parse-sqs-message';
import { MessageProcessor } from 'app/message-processor';

export interface SqsHandlerDependencies {
  logger: Logger;
  eventPublisher: EventPublisher;
}

type EventToPublish = {
  submitted?: MessageRequestSubmitted;
  rejected?: MessageRequestRejected;
};

async function handlePdmResourceAvailable(
  messageProcessor: MessageProcessor,
  incoming: PDMResourceAvailable,
): Promise<EventToPublish> {
  const eventToPublish = {} as EventToPublish;

    const request = mapPdmEventToSingleMessageRequest(incoming, sender);
    const notifyId = await messageProcessor.process(
      request,
      incoming.data.senderId,
    );
    const messageRequestSubmitted = mapPdmEventToMessageRequestSubmitted(
      incoming,
      sender,
      notifyId,
    );
    eventToPublish.submitted = messageRequestSubmitted;

  return eventToPublish;
}

export const createHandler = ({
  eventPublisher,
  logger,
  messageProcessor,
}: SqsHandlerDependencies) =>
  async function handler(sqsEvent: SQSEvent): Promise<SQSBatchResponse> {
    const receivedItemCount = sqsEvent.Records.length;

    logger.info({
      description: `Received SQS Event of ${receivedItemCount} record(s)`,
    });

    const batchItemFailures: SQSBatchItemFailure[] = [];
    const submittedEvents: MessageRequestSubmitted[] = [];
    const rejectedEvents: MessageRequestRejected[] = [];

    let incoming: PDMResourceAvailable;

    await Promise.all(
      sqsEvent.Records.map(async (sqsRecord: SQSRecord) => {
        try {
          incoming = parseSqsRecord(sqsRecord, logger);

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
