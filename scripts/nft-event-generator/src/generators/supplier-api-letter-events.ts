import { randomUUID } from 'node:crypto';
import supplierApiLetterEventTemplate from 'event-templates/supplier-api-letter-event.json';

export const LETTER_STATUSES = [
  'ACCEPTED',
  'REJECTED',
  'PRINTED',
  'DISPATCHED',
  'FAILED',
  'RETURNED',
  'PENDING',
  'ENCLOSED',
  'CANCELLED',
  'FORWARDED',
  'DELIVERED',
] as const;

export type LetterStatus = (typeof LETTER_STATUSES)[number];

export type SupplierApiLetterEvent = {
  id: string;
  specversion: '1.0';
  source: string;
  type: string;
  plane: 'data';
  dataschema: string;
  dataschemaversion: string;
  subject: string;
  time: string;
  recordedtime: string;
  datacontenttype: 'application/json';
  traceparent: string;
  severitynumber: number;
  severitytext?: string;
  data: SupplierApiLetterData;
};

type SupplierApiLetterData = {
  domainId: string;
  groupId: string;
  specificationId: string;
  supplierId: string;
  billingRef: string;
  status: LetterStatus;
  origin: {
    domain: string;
    event: string;
    source: string;
    subject: string;
  };
};

const SENDER_ID = '00f3b388-bbe9-41c9-9e76-052d37ee8988';

type GenerateEventsParams = {
  numberOfEvents: number;
  environment: string;
  status: LetterStatus;
  id?: string;
  time?: string;
  subject?: string;
  messageReference?: string;
};

function generateSupplierApiLetterEvent(
  environment: string,
  status: LetterStatus,
  overrides: {
    id?: string;
    time?: string;
    subject?: string;
    messageReference?: string;
  } = {},
): SupplierApiLetterEvent {
  const now = new Date();
  const id = overrides.id ?? randomUUID();
  const messageReference = overrides.messageReference ?? randomUUID();
  const time = overrides.time ?? now.toISOString();
  const subject =
    overrides.subject ??
    `letter-origin/letter-rendering/letter/${SENDER_ID}_${messageReference}`;

  return {
    ...supplierApiLetterEventTemplate,
    id,
    time,
    recordedtime: time,
    subject,
    specversion: '1.0',
    plane: 'data',
    datacontenttype: 'application/json',
    source: `/data-plane/supplier-api/${environment}/update-status`,
    type: `uk.nhs.notify.supplier-api.letter.${status}.v1`,
    dataschema: `https://notify.nhs.uk/cloudevents/schemas/supplier-api/letter.${status}.${supplierApiLetterEventTemplate.dataschemaversion}.schema.json`,
    data: {
      ...supplierApiLetterEventTemplate.data,
      status,
      origin: {
        ...supplierApiLetterEventTemplate.data.origin,
        subject: `client/${SENDER_ID}/letter-request/${messageReference}`,
      },
    },
  };
}

export function generateSupplierApiLetterEvents({
  environment,
  id,
  messageReference,
  numberOfEvents,
  status,
  subject,
  time,
}: GenerateEventsParams): SupplierApiLetterEvent[] {
  const events: SupplierApiLetterEvent[] = [];

  for (let i = 0; i < numberOfEvents; i++) {
    events.push(
      generateSupplierApiLetterEvent(environment, status, {
        id,
        time,
        subject,
        messageReference,
      }),
    );
  }

  console.group('Event generation:');
  console.log(`Total events generated:\t\t${numberOfEvents}`);
  console.log(`Status:\t\t\t\t${status}`);
  console.groupEnd();

  return events;
}
