import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import type { CreateTtl, CreateTtlOutcome } from 'app/create-ttl';
import { $TtlItemEvent, EventPublisher, Logger, TtlItemEvent } from 'utils';

interface ProcessingResult {
  result: CreateTtlOutcome;
  item?: TtlItemEvent;
}

interface CreateHandlerDependencies {
  createTtl: CreateTtl;
  eventPublisher: EventPublisher;
  logger: Logger;
}

export const createHandler = ({
  createTtl,
  eventPublisher,
  logger,
}: CreateHandlerDependencies) =>
  async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
    const batchItemFailures: SQSBatchItemFailure[] = [];
    const successfulEvents: TtlItemEvent[] = [];

    const promises = event.Records.map(
      async ({ body, messageId }): Promise<ProcessingResult> => {
        try {
          const {
            data: item,
            error: parseError,
            success: parseSuccess,
          } = $TtlItemEvent.safeParse(JSON.parse(body));

          if (!parseSuccess) {
            logger.error({
              err: parseError,
              description: 'Error parsing ttl queue entry',
            });
            batchItemFailures.push({ itemIdentifier: messageId });
            return { result: 'failed' };
          }

          const result = await createTtl.send(item);

          if (result === 'failed') {
            batchItemFailures.push({ itemIdentifier: messageId });
            return { result: 'failed' };
          }

          return { result, item };
        } catch (error) {
          logger.error({
            err: error,
            description: 'Error during SQS trigger handler',
          });

          batchItemFailures.push({ itemIdentifier: messageId });

          return { result: 'failed' };
        }
      },
    );

    const results = await Promise.allSettled(promises);

    const processed: Record<CreateTtlOutcome | 'retrieved', number> = {
      retrieved: results.length,
      sent: 0,
      failed: 0,
    };

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { item, result: outcome } = result.value;
        processed[outcome] += 1;

        if (outcome === 'sent' && item) {
          successfulEvents.push(item);
        }
      } else {
        logger.error({ err: result.reason });
        processed.failed += 1;
      }
    }

    if (successfulEvents.length > 0) {
      try {
        // NOTE: CCM-12896 created to send an actual ItemEnqueued event.
        const failedEvents = await eventPublisher.sendEvents(successfulEvents);
        if (failedEvents.length > 0) {
          logger.warn({
            description: 'Some events failed to publish',
            failedCount: failedEvents.length,
            totalAttempted: successfulEvents.length,
          });
        }
      } catch (error) {
        logger.warn({
          err: error,
          description: 'Failed to send events to EventBridge',
          eventCount: successfulEvents.length,
        });
      }
    }

    logger.info({
      description: 'Processed SQS Event.',
      ...processed,
    });

    return { batchItemFailures };
  };

export default createHandler;
