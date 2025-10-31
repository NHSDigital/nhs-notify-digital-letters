import { $CloudEvent, validateCloudEvent } from '../../types/cloud-event';

describe('$CloudEvent', () => {
  const valid = {
    id: 'id',
    source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
    specversion: '1',
    type: 'uk.nhs.notify.digital.letters.example.v1',
    plane: 'p',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    time: '2024-07-10T14:30:00Z',
    datacontenttype: 'json',
    dataschema:
      'https://notify.nhs.uk/schemas/events/digital-letters/2025-10/digital-letters.schema.json',
    dataschemaversion: '1',
    data: {
      'digital-letter-id': '123e4567-e89b-12d3-a456-426614174000',
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
    id: 'id',
    source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
    specversion: '1',
    type: 'uk.nhs.notify.digital.letters.example.v1',
    plane: 'p',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    time: '2024-07-10T14:30:00Z',
    datacontenttype: 'json',
    dataschema:
      'https://notify.nhs.uk/schemas/events/digital-letters/2025-10/digital-letters.schema.json',
    dataschemaversion: '1',
    data: {
      'digital-letter-id': '123e4567-e89b-12d3-a456-426614174000',
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
