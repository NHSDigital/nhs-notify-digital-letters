import { $CloudEvent, validateCloudEvent } from '../../types/cloud-event';

describe('$CloudEvent', () => {
  const valid = {
    profileversion: '1.0.0',
    profilepublished: '2025-10',
    id: '550e8400-e29b-41d4-a716-446655440001',
    specversion: '1.0',
    source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    type: 'uk.nhs.notify.digital.letters.example.with.multiple.words.v1',
    time: '2024-07-10T14:30:00Z',
    recordedtime: '2024-07-10T14:30:00.250Z',
    severitynumber: 2,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letter-base-data.schema.json',
    dataschemaversion: '1',
    severitytext: 'INFO',
    data: {
      'digital-letter-id': '123e4567-e89b-12d3-a456-426614174000',
      messageReference: 'ref1',
      senderId: 'sender1',
    },
  };

  it('parses a valid CloudEvent', () => {
    expect($CloudEvent.parse(valid)).toEqual(valid);
  });

  it('fails for missing required fields', () => {
    expect(() => $CloudEvent.parse({})).toThrow();
  });

  it('fails for invalid source pattern', () => {
    const invalid = { ...valid, source: 'invalid-source' };
    expect(() => $CloudEvent.parse(invalid)).toThrow();
  });

  it('fails for invalid subject pattern', () => {
    const invalid = { ...valid, subject: 'invalid-subject' };
    expect(() => $CloudEvent.parse(invalid)).toThrow();
  });

  it('fails for invalid type pattern', () => {
    const invalid = { ...valid, type: 'invalid.type' };
    expect(() => $CloudEvent.parse(invalid)).toThrow();
  });

  it('fails for missing digital-letter-id in data', () => {
    const invalid = { ...valid, data: {} };
    expect(() => $CloudEvent.parse(invalid)).toThrow();
  });
});

describe('validateCloudEvent', () => {
  const valid = {
    profileversion: '1.0.0',
    profilepublished: '2025-10',
    id: '550e8400-e29b-41d4-a716-446655440002',
    specversion: '1.0',
    source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    type: 'uk.nhs.notify.digital.letters.example.with.multiple.words.v1',
    time: '2024-07-10T14:30:00Z',
    recordedtime: '2024-07-10T14:30:00.250Z',
    severitynumber: 2,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/cloudevents/schemas/digital-letters/2025-10/digital-letter-base-data.schema.json',
    dataschemaversion: '1',
    severitytext: 'INFO',
    data: {
      'digital-letter-id': '123e4567-e89b-12d3-a456-426614174000',
      messageReference: 'ref1',
      senderId: 'sender1',
    },
  };

  it('returns success for valid CloudEvent', () => {
    const result = validateCloudEvent(valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(valid);
  });

  it('returns failure for invalid CloudEvent', () => {
    const result = validateCloudEvent({});
    expect(result.success).toBe(false);
  });
});
