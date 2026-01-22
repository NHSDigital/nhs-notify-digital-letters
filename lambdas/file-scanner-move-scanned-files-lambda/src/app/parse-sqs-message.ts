import { GuardDutyScanResultNotificationEvent, SQSRecord } from 'aws-lambda';
import { Logger } from 'utils';

export const parseSqsRecord = (
  sqsRecord: SQSRecord,
  logger: Logger,
): GuardDutyScanResultNotificationEvent => {
  logger.info({
    description: 'Parsing SQS Record',
    messageId: sqsRecord.messageId,
  });

  const sqsEventBody = JSON.parse(sqsRecord.body);
  // remove
  logger.info({
    description: 'Parsed SQS record body',
    body: sqsEventBody,
  });

  const sqsEventDetail = sqsEventBody.detail;
  logger.info({
    description: 'Parsed body detail',
    body: sqsEventDetail,
  });

  logger.debug({
    description: 'Returning detail as GuardDutyScanResultNotificationEvent',
    detail: sqsEventDetail,
  });
  return sqsEventDetail as GuardDutyScanResultNotificationEvent;
};
