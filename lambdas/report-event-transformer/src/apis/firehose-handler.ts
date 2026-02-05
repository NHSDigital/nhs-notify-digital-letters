import type {
  FirehoseTransformationEvent,
  FirehoseTransformationEventRecord,
  FirehoseTransformationResult,
  FirehoseTransformationResultRecord,
} from 'aws-lambda';
import {
  $DigitalLettersEvent,
  DigitalLettersEvent,
  FlatDigitalLettersEvent,
  ReportEvent,
} from 'types/events';
import { Logger } from 'utils';

export interface HandlerDependencies {
  logger: Logger;
}

type ValidatedRecord = {
  recordId: string;
  event: DigitalLettersEvent;
};

function validateRecord(
  { data, recordId }: FirehoseTransformationEventRecord,
  logger: Logger,
): ValidatedRecord | null {
  try {
    const eventBody = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    const eventDetail = eventBody.detail;

    const {
      data: item,
      error: parseError,
      success: parseSuccess,
    } = $DigitalLettersEvent.safeParse(eventDetail);

    if (!parseSuccess) {
      logger.warn({
        err: parseError,
        description: 'Error parsing firehose item',
      });

      return null;
    }

    return { recordId, event: item };
  } catch (error) {
    logger.warn({
      err: error,
      description: 'Error parsing firehose record',
    });

    return null;
  }
}

function generateReportEvent(validatedRecord: ValidatedRecord): ReportEvent {
  const {
    messageReference,
    pageCount,
    reasonCode,
    reasonText,
    senderId,
    supplierId,
  } = validatedRecord.event.data;
  const { time, type } = validatedRecord.event;
  const eventTime = new Date(time);

  const flattenedEvent: FlatDigitalLettersEvent = {
    messageReference,
    pageCount,
    senderId,
    supplierId,
    reasonCode,
    reasonText,
    time,
    type,
  };

  return {
    recordId: validatedRecord.recordId,
    data: Buffer.from(JSON.stringify(flattenedEvent)).toString('base64'),
    result: 'Ok',
    metadata: {
      partitionKeys: {
        year: eventTime.getUTCFullYear().toString(),
        month: (eventTime.getUTCMonth() + 1).toString(),
        day: eventTime.getUTCDate().toString(),
        senderId,
      },
    },
  };
}

export const createHandler = ({ logger }: HandlerDependencies) =>
  async function handler(
    firehoseTransformationEvent: FirehoseTransformationEvent,
  ): Promise<FirehoseTransformationResult> {
    const receivedItemCount = firehoseTransformationEvent.records.length;
    const failedEvents: FirehoseTransformationResultRecord[] = [];
    const validEvents: ReportEvent[] = [];

    logger.info(`Received Firehose Event of ${receivedItemCount} record(s)`);

    for (const record of firehoseTransformationEvent.records) {
      const validated = validateRecord(record, logger);
      if (validated) {
        validEvents.push(generateReportEvent(validated));
      } else {
        failedEvents.push({ ...record, result: 'ProcessingFailed' });
      }
    }

    const processedItemCount = receivedItemCount - failedEvents.length;
    logger.info(
      `${processedItemCount} of ${receivedItemCount} records processed successfully`,
    );

    return { records: [...validEvents, ...failedEvents] };
  };
