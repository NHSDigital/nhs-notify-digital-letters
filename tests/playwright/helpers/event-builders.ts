import {
  ItemDequeued,
  ItemRemoved,
  PrintLetterTransitioned,
} from 'digital-letters-events';

function buildBaseEvent(sourceComponent: string, time: string) {
  return {
    specversion: '1.0',
    source: `/nhs/england/notify/production/primary/data-plane/digitalletters/${sourceComponent}`,
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    time,
    recordedtime: time,
    severitynumber: 2,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    datacontenttype: 'application/json',
    severitytext: 'INFO',
  };
}

export function buildItemRemovedEvent(
  eventId: string,
  time: string,
  messageReference: string,
  senderId: string,
): ItemRemoved {
  const baseEvent = buildBaseEvent('queue', time);
  return {
    ...baseEvent,
    id: eventId,
    type: 'uk.nhs.notify.digital.letters.queue.item.removed.v1',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-queue-item-removed-data.schema.json',
    data: {
      messageReference,
      senderId,
      messageUri: `https://example.com/ttl/resource/${eventId}`,
    },
  } as ItemRemoved;
}

export function buildItemDequeuedEvent(
  eventId: string,
  time: string,
  messageReference: string,
  senderId: string,
): ItemDequeued {
  const baseEvent = buildBaseEvent('queue', time);
  return {
    ...baseEvent,
    id: eventId,
    type: 'uk.nhs.notify.digital.letters.queue.item.dequeued.v1',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-queue-item-dequeued-data.schema.json',
    data: {
      messageReference,
      senderId,
      messageUri: `https://example.com/ttl/resource/${eventId}`,
    },
  } as ItemDequeued;
}

export function buildPrintLetterTransitionedEvent(
  eventId: string,
  time: string,
  messageReference: string,
  status: string,
  senderId: string,
): PrintLetterTransitioned {
  const baseEvent = buildBaseEvent('print', time);
  return {
    ...baseEvent,
    id: eventId,
    type: 'uk.nhs.notify.digital.letters.print.letter.transitioned.v1',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10-draft/data/digital-letters-print-letter-transitioned-data.schema.json',
    data: {
      messageReference,
      senderId,
      status,
      supplierId: 'supplier-1',
      time,
    },
  } as PrintLetterTransitioned;
}
