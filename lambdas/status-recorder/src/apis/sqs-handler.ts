import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import {
  $DigitalLettersEvent,
  DigitalLettersEvent,
  ReportEvent,
} from 'types/events';
import { Logger } from 'utils';

export interface HandlerDependencies {
  athenaArn: string;
  logger: Logger;
}

type ValidatedRecord = {
  messageId: string;
  event: DigitalLettersEvent;
};

function validateRecord(
  { body, messageId }: { body: string; messageId: string },
  logger: Logger,
): ValidatedRecord | null {
  try {
    const sqsEventBody = JSON.parse(body);
    const sqsEventDetail = sqsEventBody.detail;

    const {
      data: item,
      error: parseError,
      success: parseSuccess,
    } = $DigitalLettersEvent.safeParse(sqsEventDetail);

    if (!parseSuccess) {
      logger.warn({
        err: parseError,
        description: 'Error parsing queue item',
      });

      return null;
    }

    return { messageId, event: item };
  } catch (error) {
    logger.warn({
      err: error,
      description: 'Error parsing SQS record',
    });

    return null;
  }
}

function generateReportEvent(event: DigitalLettersEvent): ReportEvent {
  const {
    messageReference,
    pageCount,
    senderId: senderID,
    supplierId,
  } = event.data;
  const { time, type } = event;

  return {
    messageReference,
    senderId: senderID,
    pageCount,
    supplierId,
    time,
    type,
  };
}

export const createHandler = ({ athenaArn, logger }: HandlerDependencies) =>
  async function handler(sqsEvent: SQSEvent): Promise<SQSBatchResponse> {
    const receivedItemCount = sqsEvent.Records.length;
    const batchItemFailures: SQSBatchItemFailure[] = [];
    const validatedRecords: ValidatedRecord[] = [];
    const validEvents: ReportEvent[] = [];

    logger.info(`Received SQS Event of ${receivedItemCount} record(s)`);

    for (const record of sqsEvent.Records) {
      const validated = validateRecord(record, logger);
      if (validated) {
        validatedRecords.push(validated);
      } else {
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    for (const validatedRecord of validatedRecords) {
      const { event } = validatedRecord;
      validEvents.push(generateReportEvent(event));
    }

    logger.info({
      description: `Following report events will be sent to ${athenaArn}`,
      validEvents,
    });

    const processedItemCount = receivedItemCount - batchItemFailures.length;
    logger.info(
      `${processedItemCount} of ${receivedItemCount} records processed successfully`,
    );

    return { batchItemFailures };
  };
