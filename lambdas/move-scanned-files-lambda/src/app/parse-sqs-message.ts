import {
  GuardDutyScanResultNotificationEventDetail,
  SQSRecord,
} from 'aws-lambda';
import { Logger } from 'utils';

export const parseSqsRecord = (
  sqsRecord: SQSRecord,
  logger: Logger,
): GuardDutyScanResultNotificationEventDetail => {
  logger.info({
    description: 'Parsing SQS Record',
    messageId: sqsRecord.messageId,
  });

  const sqsEventBody = JSON.parse(sqsRecord.body);
  const sqsEventDetail = sqsEventBody.detail;

  logger.debug({
    description: 'Returning detail as GuardDutyScanResultNotificationEvent',
    detail: sqsEventDetail,
  });
  return sqsEventDetail as GuardDutyScanResultNotificationEventDetail;
};
