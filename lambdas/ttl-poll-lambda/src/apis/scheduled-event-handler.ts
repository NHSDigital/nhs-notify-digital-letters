import type { ScheduledEvent } from 'aws-lambda';
import { Logger, validateIsoDate } from 'utils';
import { TtlExpiryService } from 'infra/ttl-expiry-service';

export type CreateHandlerDependencies = {
  logger: Logger;
  ttlExpiryService: TtlExpiryService;
};

export interface EventDetail {
  dateOfExpiry?: string;
  timeOfExpiry?: string;
}

export const createHandler = ({
  logger,
  ttlExpiryService,
}: CreateHandlerDependencies) => {
  function logAndReturnError(message: string, e?: unknown): unknown {
    logger.error({ description: message, err: e });
    return e || new Error(message);
  }

  return async (event: ScheduledEvent<EventDetail>) => {
    logger.info({ description: 'Beginning polling of DynamoDB', event });
    const startTimeMs = Date.now();

    let dateOfExpiry = event.detail?.dateOfExpiry;
    if (dateOfExpiry === undefined) {
      // Use date one hour ago
      const date = new Date(Date.now() - 60 * 60 * 1000);
      [dateOfExpiry] = date.toISOString().split('T');
    } else if (!validateIsoDate(dateOfExpiry)) {
      throw logAndReturnError(
        `dateOfExpiry is not valid ISO date format (YYYY-MM-DD): ${dateOfExpiry}`,
      );
    }

    let ttlBeforeSeconds = Math.floor(startTimeMs / 1000);
    const timeOfExpiry = event.detail?.timeOfExpiry;
    if (timeOfExpiry) {
      const parsedTimeOfExpiry = Date.parse(timeOfExpiry);
      if (Number.isNaN(parsedTimeOfExpiry)) {
        throw logAndReturnError(
          `timeOfExpiry is not valid date format (YYYY-MM-DD'T'HH:MM:SSZ): ${timeOfExpiry}`,
        );
      }
      ttlBeforeSeconds = Math.floor(parsedTimeOfExpiry / 1000);
    }

    let result;
    try {
      result = await ttlExpiryService.processExpiredTtlRecords(
        dateOfExpiry,
        ttlBeforeSeconds,
        startTimeMs,
      );
    } catch (error: unknown) {
      throw logAndReturnError(
        'Error encountered whilst attempting to process records',
        error,
      );
    }

    logger.info('Finished polling dynamodb', result);

    return result;
  };
};
