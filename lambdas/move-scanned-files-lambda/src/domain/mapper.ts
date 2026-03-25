import { randomUUID } from 'node:crypto';
import { DL_CLIV_003 } from 'digital-letters-events/failure-codes';
import { FileQuarantined, FileSafe } from 'digital-letters-events';

export function createFileSafeEvent(
  messageReference: string,
  senderId: string,
  letterUri: string,
  createdAt: string,
): FileSafe {
  return {
    specversion: '1.0',
    id: randomUUID(),
    subject: `customer/${senderId}/recipient/${messageReference}`,
    source:
      '/nhs/england/notify/production/primary/data-plane/digitalletters/print', // Note CCM-13892.
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01', // Note CCM-14255.
    type: 'uk.nhs.notify.digital.letters.print.file.safe.v1',
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

export function createFileQuarantinedEvent(
  messageReference: string,
  senderId: string,
  letterUri: string,
  createdAt: string,
): FileQuarantined {
  return {
    specversion: '1.0',
    id: randomUUID(),
    subject: `customer/${senderId}/recipient/${messageReference}`,
    source:
      '/nhs/england/notify/production/primary/data-plane/digitalletters/print', // Note CCM-13892.
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01', // Note CCM-14255.
    type: 'uk.nhs.notify.digital.letters.print.file.quarantined.v1',
    time: new Date().toISOString(),
    data: {
      messageReference,
      senderId,
      letterUri,
      createdAt,
      reasonCode: DL_CLIV_003,
    },
    recordedtime: new Date().toISOString(),
    severitynumber: 2,
  };
}
