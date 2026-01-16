import { SQSRecord } from 'aws-lambda';
import { Logger } from 'utils';
import { PDMResourceAvailable } from 'digital-letters-events';
import { InvalidPdmResourceAvailableEvent } from 'domain/invalid-pdm-resource-available-event';
import messagePDMResourceAvailableValidator from 'digital-letters-events/PDMResourceAvailable.js';

export const parseSqsRecord = (
  sqsRecord: SQSRecord,
  logger: Logger,
): PDMResourceAvailable => {
  logger.info({
    description: 'Parsing SQS Record',
    messageId: sqsRecord.messageId,
  });

  const sqsEventBody = JSON.parse(sqsRecord.body);
  const sqsEventDetail = sqsEventBody.detail;

  if (!messagePDMResourceAvailableValidator(sqsEventDetail)) {
    logger.error({
      error: messagePDMResourceAvailableValidator.errors,
      description:
        'The SQS message does not contain a valid PDMResourceAvailable event',
      messageId: sqsRecord.messageId,
    });
    throw new InvalidPdmResourceAvailableEvent(sqsRecord.messageId);
  }

  logger.info({
    description: 'Parsed valid PDMResourceAvailable Event',
    messageId: sqsRecord.messageId,
    messageReference: sqsEventDetail.data.messageReference,
    senderId: sqsEventDetail.data.senderId,
    resourceId: sqsEventDetail.data.resourceId,
  });

  return sqsEventDetail;
};
