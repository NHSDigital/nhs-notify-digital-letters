import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import { Logger } from 'utils';
import type { CreateTtl, CreateTtlOutcome } from 'app/create-ttl';
import { $TtlItem } from 'app/ttl-item-validator';

type CreateHandlerDependencies = {
  createTtl: CreateTtl;
  logger: Logger;
};

export const createHandler = ({
  createTtl,
  logger,
}: CreateHandlerDependencies) =>
  async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
    const batchItemFailures: SQSBatchItemFailure[] = [];

    const promises = event.Records.map(async ({ body, messageId }) => {
      try {
        const {
          data: item,
          error: parseError,
          success: parseSuccess,
        } = $TtlItem.safeParse(JSON.parse(body));
        if (!parseSuccess) {
          logger.error({
            err: parseError,
            description: 'Error parsing ttl queue entry',
          });
          batchItemFailures.push({ itemIdentifier: messageId });
          return 'failed';
        }

        const result = await createTtl.send(item);

        if (result === 'failed') {
          batchItemFailures.push({ itemIdentifier: messageId });
        }

        return result;
      } catch (error) {
        logger.error({
          err: error,
          description: 'Error during SQS trigger handler',
        });
        batchItemFailures.push({ itemIdentifier: messageId });

        return 'failed';
      }
    });

    const results = await Promise.allSettled(promises);

    const processed: Record<CreateTtlOutcome | 'retrieved', number> = {
      retrieved: results.length,
      sent: 0,
      failed: 0,
    };

    for (const result of results) {
      if (result.status === 'fulfilled') processed[result.value] += 1;
      if (result.status === 'rejected') {
        logger.error({ err: result.reason });
        processed.failed += 1;
      }
    }

    logger.info({
      description: 'Processed SQS Event.',
      ...processed,
    });

    return { batchItemFailures };
  };

export default createHandler;
