import { EventPublisher, Logger } from 'utils';
import { ISenderManagement } from 'sender-management';
import { GenerateReport } from 'digital-letters-events';
import GenerateReportValidator from 'digital-letters-events/GenerateReport.js';
import { randomUUID } from 'node:crypto';

export type CreateHandlerDependencies = {
  logger: Logger;
  senderManagement: ISenderManagement;
  eventPublisher: EventPublisher;
};

export const createHandler = ({
  eventPublisher,
  logger,
  senderManagement,
}: CreateHandlerDependencies) => {
  function yesterdayDateRange() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayStart = new Date(yesterday.setUTCHours(0, 0, 0, 0));
    const yesterdayEnd = new Date(yesterday.setUTCHours(23, 59, 59, 999));

    logger.debug({
      description: 'Calculated yesterday date range',
      yesterdayStart: yesterdayStart.toISOString(),
      yesterdayEnd: yesterdayEnd.toISOString(),
    });

    return { yesterdayStart, yesterdayEnd };
  }

  return async () => {
    const { yesterdayEnd, yesterdayStart } = yesterdayDateRange();

    const senders = await senderManagement.listSenders();

    await eventPublisher.sendEvents<GenerateReport>(
      senders.map((sender) => ({
        data: {
          senderId: sender.senderId,
          reportPeriodStartTime: yesterdayStart.toISOString(),
          reportPeriodEndTime: yesterdayEnd.toISOString(),
        },
        specversion: '1.0',
        id: randomUUID(),
        source:
          '/nhs/england/notify/production/primary/data-plane/digitalletters/report-scheduler', // CCM-13892
        subject: `customer/${sender.senderId}`,
        type: 'uk.nhs.notify.digital.letters.reporting.generate.report.v1',
        time: new Date().toISOString(),
        traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01', // CCM-14255
        recordedtime: new Date().toISOString(),
        severitynumber: 2,
      })),
      GenerateReportValidator,
    );
  };
};
