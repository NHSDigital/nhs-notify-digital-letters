import { SQSRecord } from 'aws-lambda';
import { Logger } from 'utils';
import { PDMResourceAvailable } from 'digital-letters-events';
import { InvalidPdmResourceAvailableEvent } from 'domain/invalid-pdm-resource-available-event';
import { messagePDMResourceAvailableValidator } from 'digital-letters-events/PDMResourceAvailable.js';

const eventValidator = messagePDMResourceAvailableValidator as (
  d: unknown,
) => d is PDMResourceAvailable;

export const parseSqsRecord = (
  sqsRecord: SQSRecord,
  logger: Logger,
): PDMResourceAvailable => {
  logger.info('Parsing SQS Record', {
    messageId: sqsRecord.messageId,
  });
  const sqsEventBody = JSON.parse(sqsRecord.body);
  const sqsEventDetail = sqsEventBody.detail;
  const isEventValid = eventValidator(sqsEventDetail);
  if (!isEventValid) {
    logger.error({
      err: messagePDMResourceAvailableValidator.errors,
      description:
        'The SQS message does not contain a valid PDMResourceAvailable event',
      messageId: sqsRecord.messageId,
    });
    throw new InvalidPdmResourceAvailableEvent(sqsRecord.messageId);
  }

  logger.info('Parsed valid PDMResourceAvailable Event', {
    messageId: sqsRecord.messageId,
  });

  return sqsEventDetail;
};
