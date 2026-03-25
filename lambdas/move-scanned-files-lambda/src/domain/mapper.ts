import { randomUUID } from 'node:crypto';
import { FileQuarantined, FileSafe } from 'digital-letters-events';

function createEventWithCommonFields(
  isFileSafe: boolean,
  messageReference: string,
  senderId: string,
  letterUri: string,
  createdAt: string,
  traceparent?: string,
): FileSafe | FileQuarantined {
  return {
    specversion: '1.0',
    id: randomUUID(),
    subject: `customer/${senderId}/recipient/${messageReference}`,
    source:
      '/nhs/england/notify/production/primary/data-plane/digitalletters/print', // Note CCM-13892.
    traceparent: traceparent ?? '', // EventPublisher will derive child or create root
    type: isFileSafe
      ? 'uk.nhs.notify.digital.letters.print.file.safe.v1'
      : 'uk.nhs.notify.digital.letters.print.file.quarantined.v1',
    time: new Date().toISOString(),
    data: {
      messageReference,
      senderId,
      letterUri,
      createdAt,
    },

    recordedtime: new Date().toISOString(),
    severitynumber: 2,
  };
}

export function createFileSafeEvent(
  messageReference: string,
  senderId: string,
  letterUri: string,
  createdAt: string,
  traceparent?: string,
): FileSafe {
  return createEventWithCommonFields(
    true,
    messageReference,
    senderId,
    letterUri,
    createdAt,
    traceparent,
  ) as FileSafe;
}

export function createFileQuarantinedEvent(
  messageReference: string,
  senderId: string,
  letterUri: string,
  createdAt: string,
  traceparent?: string,
): FileQuarantined {
  return createEventWithCommonFields(
    false,
    messageReference,
    senderId,
    letterUri,
    createdAt,
    traceparent,
  ) as FileQuarantined;
}
