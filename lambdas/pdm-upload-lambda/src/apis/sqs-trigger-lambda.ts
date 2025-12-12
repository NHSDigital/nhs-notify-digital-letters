import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import type {
  UploadToPdm,
  UploadToPdmOutcome,
  UploadToPdmResult,
} from 'app/upload-to-pdm';
import { EventPublisher, Logger } from 'utils';
import messageDownloadedValidator from 'digital-letters-events/MESHInboxMessageDownloaded.js';
import pdmResourceSubmittedValidator from 'digital-letters-events/PDMResourceSubmitted.js';
import pdmResourceSubmissionRejectedValidator from 'digital-letters-events/PDMResourceSubmissionRejected.js';
import {
  MESHInboxMessageDownloaded,
  PDMResourceSubmissionRejected,
  PDMResourceSubmitted,
} from 'digital-letters-events';

interface ProcessingResult {
  result: UploadToPdmResult;
  item?: MESHInboxMessageDownloaded;
}

interface CreateHandlerDependencies {
  uploadToPdm: UploadToPdm;
  eventPublisher: EventPublisher;
  logger: Logger;
}

async function processRecord(
  { body, messageId }: { body: string; messageId: string },
  uploadToPdm: UploadToPdm,
  logger: Logger,
  batchItemFailures: SQSBatchItemFailure[],
): Promise<ProcessingResult> {
  try {
    const eventDetail = JSON.parse(body).detail;
    const isValid = messageDownloadedValidator(eventDetail);

    if (!isValid) {
      logger.error({
        err: messageDownloadedValidator.errors,
        description: 'Error parsing queue entry',
      });
      batchItemFailures.push({ itemIdentifier: messageId });
      return { result: { outcome: 'failed' } };
    }

    const item = eventDetail as MESHInboxMessageDownloaded;
    const result = await uploadToPdm.send(item);

    if (result.outcome === 'failed') {
      batchItemFailures.push({ itemIdentifier: messageId });
      return { result: { outcome: 'failed' }, item };
    }

    return { result, item };
  } catch (error) {
    logger.error({
      err: error,
      description: 'Error during SQS trigger handler',
    });
    batchItemFailures.push({ itemIdentifier: messageId });
    return { result: { outcome: 'failed' } };
  }
}

function categorizeResults(
  results: PromiseSettledResult<ProcessingResult>[],
  successfulEvents: PDMResourceSubmitted[],
  failedEvents: PDMResourceSubmissionRejected[],
  logger: Logger,
): Record<UploadToPdmOutcome | 'retrieved', number> {
  const processed: Record<UploadToPdmOutcome | 'retrieved', number> = {
    retrieved: results.length,
    sent: 0,
    failed: 0,
  };

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { item, result: itemResult } = result.value;
      processed[itemResult.outcome] += 1;

      if (item) {
        if (itemResult.outcome === 'sent' && itemResult.resourceId) {
          successfulEvents.push({
            specversion: item.specversion,
            id: item.id,
            source: item.source,
            subject: item.subject,
            type: 'uk.nhs.notify.digital.letters.pdm.resource.submitted.v1',
            time: item.time,
            datacontenttype: item.datacontenttype,
            dataschema:
              'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-submitted-data.schema.json',
            recordedtime: item.recordedtime,
            traceparent: item.traceparent,
            tracestate: item.tracestate,
            partitionkey: item.partitionkey,
            sampledrate: item.sampledrate,
            sequence: item.sequence,
            severitytext: item.severitytext,
            severitynumber: item.severitynumber,
            dataclassification: item.dataclassification,
            dataregulation: item.dataregulation,
            datacategory: item.datacategory,
            data: {
              messageReference: item.data.messageReference,
              senderId: item.data.senderId,
              resourceId: itemResult.resourceId,
              retryCount: 0,
            },
          });
        } else {
          failedEvents.push({
            specversion: item.specversion,
            id: item.id,
            source: item.source,
            subject: item.subject,
            type: 'uk.nhs.notify.digital.letters.pdm.resource.submission.rejected.v1',
            time: item.time,
            datacontenttype: item.datacontenttype,
            dataschema:
              'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-pdm-resource-submission-rejected-data.schema.json',
            recordedtime: item.recordedtime,
            traceparent: item.traceparent,
            tracestate: item.tracestate,
            partitionkey: item.partitionkey,
            sampledrate: item.sampledrate,
            sequence: item.sequence,
            severitytext: item.severitytext,
            severitynumber: item.severitynumber,
            dataclassification: item.dataclassification,
            dataregulation: item.dataregulation,
            datacategory: item.datacategory,
            data: {
              messageReference: item.data.messageReference,
              senderId: item.data.senderId,
            },
          });
        }
      }
    } else {
      logger.error({ err: result.reason });
      processed.failed += 1;
    }
  }

  return processed;
}

async function publishSuccessfulEvents(
  successfulEvents: PDMResourceSubmitted[],
  eventPublisher: EventPublisher,
  logger: Logger,
): Promise<void> {
  if (successfulEvents.length === 0) return;

  try {
    const submittedFailedEvents = await eventPublisher.sendEvents(
      successfulEvents.map((event) => ({
        ...event,
        id: randomUUID(),
        time: new Date().toISOString(),
        recordedtime: new Date().toISOString(),
        type: 'uk.nhs.notify.digital.letters.pdm.resource.submitted.v1',
      })),
      pdmResourceSubmittedValidator,
    );
    if (submittedFailedEvents.length > 0) {
      logger.warn({
        description: 'Some successful events failed to publish',
        failedCount: submittedFailedEvents.length,
        totalAttempted: successfulEvents.length,
      });
    }
  } catch (error) {
    logger.warn({
      err: error,
      description: 'Failed to send successful events to EventBridge',
      eventCount: successfulEvents.length,
    });
  }
}

async function publishFailedEvents(
  failedEvents: PDMResourceSubmissionRejected[],
  eventPublisher: EventPublisher,
  logger: Logger,
): Promise<void> {
  if (failedEvents.length === 0) return;

  try {
    const rejectedFailedEvents = await eventPublisher.sendEvents(
      failedEvents.map((event) => ({
        ...event,
        id: randomUUID(),
        time: new Date().toISOString(),
        recordedtime: new Date().toISOString(),
        type: 'uk.nhs.notify.digital.letters.pdm.resource.submission.rejected.v1',
      })),
      pdmResourceSubmissionRejectedValidator,
    );
    if (rejectedFailedEvents.length > 0) {
      logger.warn({
        description: 'Some failed events failed to publish',
        failedCount: rejectedFailedEvents.length,
        totalAttempted: failedEvents.length,
      });
    }
  } catch (error) {
    logger.warn({
      err: error,
      description: 'Failed to send failed events to EventBridge',
      eventCount: failedEvents.length,
    });
  }
}

export const createHandler = ({
  eventPublisher,
  logger,
  uploadToPdm,
}: CreateHandlerDependencies) =>
  async function handler(sqsEvent: SQSEvent): Promise<SQSBatchResponse> {
    const batchItemFailures: SQSBatchItemFailure[] = [];
    const successfulEvents: PDMResourceSubmitted[] = [];
    const failedEvents: PDMResourceSubmissionRejected[] = [];

    const promises = sqsEvent.Records.map((record) =>
      processRecord(record, uploadToPdm, logger, batchItemFailures),
    );

    const results = await Promise.allSettled(promises);
    const processed = categorizeResults(
      results,
      successfulEvents,
      failedEvents,
      logger,
    );

    await publishSuccessfulEvents(successfulEvents, eventPublisher, logger);
    await publishFailedEvents(failedEvents, eventPublisher, logger);

    logger.info({
      description: 'Processed SQS Event.',
      ...processed,
    });

    return { batchItemFailures };
  };

export default createHandler;
