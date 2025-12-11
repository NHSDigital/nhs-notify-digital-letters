import { SQSRecord } from 'aws-lambda';
import { Logger } from 'utils';
import { PDMResourceAvailable } from 'digital-letters-events';  // replacewith_eventName
import { InvalidReplaceWith_EventNameEvent } from 'domain/invalid-replacewith_event_name-event';
import messagePDMResourceAvailableValidator from 'digital-letters-events/PDMResourceAvailable.js';  // replacewith_eventName

export const parseSqsRecord = (
  sqsRecord: SQSRecord,
  logger: Logger,
): PDMResourceAvailable => {  // replacewith_eventName
  logger.info({
    description: 'Parsing SQS Record',
    messageId: sqsRecord.messageId,
  });

  const sqsEventBody = JSON.parse(sqsRecord.body);
  const sqsEventDetail = sqsEventBody.detail;

  if (!messagePDMResourceAvailableValidator(sqsEventDetail)) {  // replacewith_eventName
    logger.error({
      error: messagePDMResourceAvailableValidator.errors,       // replacewith_eventName
      description:
        'The SQS message does not contain a valid replacewith_eventName event',
      messageId: sqsRecord.messageId,
    });
    throw new InvalidReplaceWith_EventNameEvent(sqsRecord.messageId);
  }

  logger.info({
    description: 'Parsed valid replacewith_eventName Event',
    messageId: sqsRecord.messageId,
    messageReference: sqsEventDetail.data.messageReference,
  });

  return sqsEventDetail;
};
