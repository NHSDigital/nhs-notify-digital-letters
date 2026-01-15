import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import type { PrintSender, PrintSenderOutcome } from 'app/print-sender';
import { Logger } from 'utils';
import pdfAnalysedValidator from 'digital-letters-events/PDFAnalysed.js';
import { PDFAnalysed } from 'digital-letters-events';

interface ProcessingResult {
  result: PrintSenderOutcome;
  item?: PDFAnalysed;
}

interface PrintSenderHandlerDependencies {
  printSender: PrintSender;
  logger: Logger;
}

export const createHandler = ({
  logger,
  printSender,
}: PrintSenderHandlerDependencies) =>
  async function handler(sqsEvent: SQSEvent): Promise<SQSBatchResponse> {
    const batchItemFailures: SQSBatchItemFailure[] = [];
    let sent = 0;

    const promises = sqsEvent.Records.map(
      async ({ body, messageId }): Promise<ProcessingResult> => {
        try {
          const sqsEventBody = JSON.parse(body);
          const sqsEventDetail = sqsEventBody.detail;

          const isEventValid = pdfAnalysedValidator(sqsEventDetail);
          if (!isEventValid) {
            logger.error({
              err: pdfAnalysedValidator.errors,
              description: 'Error parsing print sender queue entry',
            });
            batchItemFailures.push({ itemIdentifier: messageId });
            return { result: 'failed' };
          }
          const pdfAnalysedEvent: PDFAnalysed = sqsEventDetail;

          const result = await printSender.send(pdfAnalysedEvent);

          if (result === 'failed') {
            batchItemFailures.push({ itemIdentifier: messageId });
            return { result: 'failed' };
          }

          sent += 1;

          return { result, item: pdfAnalysedEvent };
        } catch (error) {
          logger.error({
            err: error,
            description: 'Error during SQS trigger handler',
          });

          batchItemFailures.push({ itemIdentifier: messageId });

          return { result: 'failed' };
        }
      },
    );

    const results = await Promise.allSettled(promises);

    const processed: Record<PrintSenderOutcome | 'retrieved', number> = {
      retrieved: results.length,
      sent,
      failed: batchItemFailures.length,
    };

    logger.info({
      description: 'Processed SQS Event.',
      ...processed,
    });

    return { batchItemFailures };
  };

export default createHandler;
