import { LetterEvent } from '@nhsdigital/nhs-notify-event-schemas-supplier-api/src/events/letter-events';

export const sampleSupplierApiLetterEvent: LetterEvent = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  specversion: '1.0',
  source: '/data-plane/supplier-api/dev/update-status',
  type: 'uk.nhs.notify.supplier-api.letter.ACCEPTED.v1',
  plane: 'data',
  dataschema:
    'https://notify.nhs.uk/cloudevents/schemas/supplier-api/letter.ACCEPTED.1.0.17.schema.json',
  dataschemaversion: '1.0.17',
  subject:
    'letter-origin/letter-rendering/letter/00f3b388-bbe9-41c9-9e76-052d37ee8988_2503cbd5-6722-4e90-9fbd-5f1e96d65c22',
  time: '2023-06-20T12:00:00.000Z',
  recordedtime: '2023-06-20T12:00:00.250Z',
  datacontenttype: 'application/json',
  traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
  severitynumber: 2,
  severitytext: 'INFO',
  data: {
    domainId:
      '00f3b388-bbe9-41c9-9e76-052d37ee8988_2503cbd5-6722-4e90-9fbd-5f1e96d65c22',
    groupId: 'client_template',
    specificationId: '1y3q9v1zzzz',
    supplierId: 'supplier-1',
    billingRef: '1y3q9v1zzzz',
    status: 'ACCEPTED',
    origin: {
      domain: 'letter-rendering',
      event: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      source: '/data-plane/letter-rendering/prod/render-pdf',
      subject:
        'client/00f3b388-bbe9-41c9-9e76-052d37ee8988/letter-request/2503cbd5-6722-4e90-9fbd-5f1e96d65c22',
    },
  },
};
