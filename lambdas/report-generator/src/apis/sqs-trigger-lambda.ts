import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import type {
  ReportGenerator,
  ReportGeneratorOutcome,
  ReportGeneratorResult,
} from 'app/report-generator';
import generateReportValidator from 'digital-letters-events/GenerateReport.js';
import reportGeneratedValidator from 'digital-letters-events/ReportGenerated.js';
import { GenerateReport, ReportGenerated } from 'digital-letters-events';
import { EventPublisher, Logger } from 'utils';
import { Dlq } from 'app/dlq';

interface ProcessingResult {
  result: ReportGeneratorResult;
  item: GenerateReport;
}

interface CreateHandlerDependencies {
  reportGenerator: ReportGenerator;
  eventPublisher: EventPublisher;
  logger: Logger;
  dlq: Dlq;
}

interface ValidatedRecord {
  messageId: string;
  event: GenerateReport;
}

function validateRecord(
  { body, messageId }: { body: string; messageId: string },
  logger: Logger,
): ValidatedRecord | null {
  try {
    const sqsEventBody = JSON.parse(body);
    const sqsEventDetail = sqsEventBody.detail;

    const isEventValid = generateReportValidator(sqsEventDetail);
    if (!isEventValid) {
      logger.error({
        err: generateReportValidator.errors,
        description: 'Error parsing queue entry',
      });
      return null;
    }

    return { messageId, event: sqsEventDetail };
  } catch (error) {
    logger.error({
      err: error,
      description: 'Error parsing SQS record',
    });
    return null;
  }
}

async function processRecord(
  { event, messageId }: ValidatedRecord,
  reportGenerator: ReportGenerator,
  logger: Logger,
  batchItemFailures: SQSBatchItemFailure[],
): Promise<ProcessingResult> {
  try {
    const result = await reportGenerator.generate(event);

    if (result.outcome === 'failed') {
      batchItemFailures.push({ itemIdentifier: messageId });
    }

    return { result, item: event };
  } catch (error) {
    logger.error({
      err: error,
      description: 'Error during SQS trigger handler',
    });
    batchItemFailures.push({ itemIdentifier: messageId });
    return { result: { outcome: 'failed' }, item: event };
  }
}

interface CategorizedResults {
  processed: Record<ReportGeneratorOutcome | 'retrieved', number>;
  successfulItems: { event: GenerateReport; reportUri: string }[];
}

function categorizeResults(
  results: PromiseSettledResult<ProcessingResult>[],
  logger: Logger,
): CategorizedResults {
  const processed: Record<ReportGeneratorOutcome | 'retrieved', number> = {
    retrieved: results.length,
    generated: 0,
    failed: 0,
  };

  const successfulItems: {
    event: GenerateReport;
    reportUri: string;
  }[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { item, result: itemResult } = result.value;
      processed[itemResult.outcome] += 1;

      if (itemResult.outcome === 'generated') {
        successfulItems.push({
          event: item,
          reportUri: itemResult.reportUri,
        });
      }
    } else {
      logger.error({ err: result.reason });
      processed.failed += 1;
    }
  }

  return { processed, successfulItems };
}

async function publishSuccessfulEvents(
  successfulItems: { event: GenerateReport; reportUri: string }[],
  eventPublisher: EventPublisher,
  logger: Logger,
  dlq: Dlq,
): Promise<void> {
  if (successfulItems.length === 0) return;

  // Map ReportGenerated event IDs to their original GenerateReport events
  const reportGeneratedIdToOriginalEvent = new Map<string, GenerateReport>();
  try {
    const reportGeneratedEvents: ReportGenerated[] = successfulItems.map(
      ({ event, reportUri }) => {
        const generatedEventId = randomUUID();
        const reportGeneratedEvent: ReportGenerated = {
          ...event,
          id: generatedEventId,
          time: new Date().toISOString(),
          recordedtime: new Date().toISOString(),
          type: 'uk.nhs.notify.digital.letters.reporting.report.generated.v1',
          dataschema:
            'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-reporting-report-generated-data.schema.json',
          data: {
            senderId: event.data.senderId,
            reportUri,
          },
        };
        reportGeneratedIdToOriginalEvent.set(generatedEventId, event);
        return reportGeneratedEvent;
      },
    );

    const submittedFailedEvents =
      await eventPublisher.sendEvents<ReportGenerated>(
        reportGeneratedEvents,
        reportGeneratedValidator,
      );
    if (submittedFailedEvents.length > 0) {
      // Map failed ReportGenerated events back to their original GenerateReport events
      const originalEventsToSendToDlq = submittedFailedEvents.map(
        (failedEvent) => reportGeneratedIdToOriginalEvent.get(failedEvent.id),
      ) as GenerateReport[];

      await dlq.send(originalEventsToSendToDlq);
    }
  } catch (error) {
    logger.warn({
      err: error,
      description: 'Failed to send successful events to EventBridge',
      eventCount: successfulItems.length,
    });
  }
}

export const createHandler = ({
  dlq,
  eventPublisher,
  logger,
  reportGenerator,
}: CreateHandlerDependencies) =>
  async function handler(sqsEvent: SQSEvent): Promise<SQSBatchResponse> {
    const batchItemFailures: SQSBatchItemFailure[] = [];

    const validatedRecords: ValidatedRecord[] = [];
    for (const record of sqsEvent.Records) {
      const validated = validateRecord(record, logger);
      if (validated) {
        validatedRecords.push(validated);
      } else {
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }

    const promises = validatedRecords.map((record) =>
      processRecord(record, reportGenerator, logger, batchItemFailures),
    );

    const results = await Promise.allSettled(promises);
    const { processed, successfulItems } = categorizeResults(results, logger);

    await publishSuccessfulEvents(successfulItems, eventPublisher, logger, dlq);

    logger.info({
      description: 'Processed SQS Event.',
      ...processed,
    });

    return { batchItemFailures };
  };

export default createHandler;
