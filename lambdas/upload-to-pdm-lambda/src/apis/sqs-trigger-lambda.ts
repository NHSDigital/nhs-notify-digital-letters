import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import type {
  UploadToPdm,
  UploadToPdmOutcome,
  UploadToPdmResult,
} from 'app/upload-to-pdm';
import {
  $TtlItemBusEvent,
  EventPublisher,
  Logger,
  PdmResourceRejectedEvent,
  PdmResourceSubmittedEvent,
} from 'utils';

interface ProcessingResult {
  result: UploadToPdmResult;
  item?: PdmResourceSubmittedEvent | PdmResourceRejectedEvent;
}

interface CreateHandlerDependencies {
  uploadToPdm: UploadToPdm;
  eventPublisher: EventPublisher;
  logger: Logger;
}

async function processRecord(
  { body, messageId }: { body: string; messageId: string },
  uploadToPdm: UploadToPdm,
  logger: Logger,
  batchItemFailures: SQSBatchItemFailure[],
): Promise<ProcessingResult> {
  try {
    const {
      data: item,
      error: parseError,
      success: parseSuccess,
    } = $TtlItemBusEvent.safeParse(JSON.parse(body));

    if (!parseSuccess) {
      logger.error({
        err: parseError,
        description: 'Error parsing queue entry',
      });
      batchItemFailures.push({ itemIdentifier: messageId });
      return { result: { outcome: 'failed' } };
    }

    const result = await uploadToPdm.send(item.detail);

    if (result.outcome === 'failed') {
      batchItemFailures.push({ itemIdentifier: messageId });
      return { result: { outcome: 'failed' }, item: item.detail };
    }

    return { result, item: item.detail };
  } catch (error) {
    logger.error({
      err: error,
      description: 'Error during SQS trigger handler',
    });
    batchItemFailures.push({ itemIdentifier: messageId });
    return { result: { outcome: 'failed' } };
  }
}

function categorizeResults(
  results: PromiseSettledResult<ProcessingResult>[],
  successfulEvents: PdmResourceSubmittedEvent[],
  failedEvents: PdmResourceRejectedEvent[],
  logger: Logger,
): Record<UploadToPdmOutcome | 'retrieved', number> {
  const processed: Record<UploadToPdmOutcome | 'retrieved', number> = {
    retrieved: results.length,
    sent: 0,
    failed: 0,
  };

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { item, result: itemResult } = result.value;
      processed[itemResult.outcome] += 1;

      if (item) {
        if (itemResult.outcome === 'sent' && itemResult.resourceId) {
          successfulEvents.push({
            ...item,
            data: {
              'digital-letter-id': item.data['digital-letter-id'],
              messageReference: item.data.messageReference,
              senderId: item.data.senderId,
              resourceId: itemResult.resourceId,
              retryCount: 0,
            },
          });
        } else {
          failedEvents.push({
            ...item,
            data: {
              'digital-letter-id': item.data['digital-letter-id'],
              messageReference: item.data.messageReference,
              senderId: item.data.senderId,
            },
          });
        }
      }
    } else {
      logger.error({ err: result.reason });
      processed.failed += 1;
    }
  }

  return processed;
}

async function publishSuccessfulEvents(
  successfulEvents: PdmResourceSubmittedEvent[],
  eventPublisher: EventPublisher,
  logger: Logger,
): Promise<void> {
  if (successfulEvents.length === 0) return;

  try {
    const submittedFailedEvents = await eventPublisher.sendEvents(
      successfulEvents.map((event) => ({
        ...event,
        id: randomUUID(),
        time: new Date().toISOString(),
        recordedtime: new Date().toISOString(),
        type: 'uk.nhs.notify.digital.letters.pdm.resource.submitted.v1',
      })),
    );
    if (submittedFailedEvents.length > 0) {
      logger.warn({
        description: 'Some successful events failed to publish',
        failedCount: submittedFailedEvents.length,
        totalAttempted: successfulEvents.length,
      });
    }
  } catch (error) {
    logger.warn({
      err: error,
      description: 'Failed to send successful events to EventBridge',
      eventCount: successfulEvents.length,
    });
  }
}

async function publishFailedEvents(
  failedEvents: PdmResourceRejectedEvent[],
  eventPublisher: EventPublisher,
  logger: Logger,
): Promise<void> {
  if (failedEvents.length === 0) return;

  try {
    const rejectedFailedEvents = await eventPublisher.sendEvents(
      failedEvents.map((event) => ({
        ...event,
        id: randomUUID(),
        time: new Date().toISOString(),
        recordedtime: new Date().toISOString(),
        type: 'uk.nhs.notify.digital.letters.pdm.resource.submission.rejected.v1',
      })),
    );
    if (rejectedFailedEvents.length > 0) {
      logger.warn({
        description: 'Some failed events failed to publish',
        failedCount: rejectedFailedEvents.length,
        totalAttempted: failedEvents.length,
      });
    }
  } catch (error) {
    logger.warn({
      err: error,
      description: 'Failed to send failed events to EventBridge',
      eventCount: failedEvents.length,
    });
  }
}

export const createHandler = ({
  eventPublisher,
  logger,
  uploadToPdm,
}: CreateHandlerDependencies) =>
  async function handler(sqsEvent: SQSEvent): Promise<SQSBatchResponse> {
    const batchItemFailures: SQSBatchItemFailure[] = [];
    const successfulEvents: PdmResourceSubmittedEvent[] = [];
    const failedEvents: PdmResourceRejectedEvent[] = [];

    const promises = sqsEvent.Records.map((record) =>
      processRecord(record, uploadToPdm, logger, batchItemFailures),
    );

    const results = await Promise.allSettled(promises);
    const processed = categorizeResults(
      results,
      successfulEvents,
      failedEvents,
      logger,
    );

    await publishSuccessfulEvents(successfulEvents, eventPublisher, logger);
    await publishFailedEvents(failedEvents, eventPublisher, logger);

    logger.info({
      description: 'Processed SQS Event.',
      ...processed,
    });

    return { batchItemFailures };
  };

export default createHandler;
