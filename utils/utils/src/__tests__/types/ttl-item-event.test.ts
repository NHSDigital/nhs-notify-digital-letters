import {
  $TtlItemEvent,
  validateTtlItemEvent,
} from '../../types/ttl-item-event';

describe('$TtlItemEvent', () => {
  const valid = {
    profileversion: '1.0.0',
    profilepublished: '2025-10',
    id: '550e8400-e29b-41d4-a716-446655440001',
    specversion: '1.0',
    source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    type: 'uk.nhs.notify.digital.letters.ttl.v1',
    time: '2024-07-10T14:30:00Z',
    recordedtime: '2024-07-10T14:30:00.250Z',
    severitynumber: 2,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/schemas/events/digital-letters/2025-10/digital-letters.schema.json',
    dataschemaversion: '1',
    severitytext: 'INFO',
    data: {
      'digital-letter-id': '123e4567-e89b-12d3-a456-426614174000',
      uri: 'https://example.com/ttl/resource',
    },
  };

  it('parses a valid object', () => {
    expect($TtlItemEvent.parse(valid)).toEqual(valid);
  });

  it('fails for missing required fields', () => {
    expect(() => $TtlItemEvent.parse({})).toThrow();
  });

  it('fails for invalid data types', () => {
    const invalid = { ...valid, id: 123, time: 'now' };
    expect(() => $TtlItemEvent.parse(invalid)).toThrow();
  });

  it('fails for missing data.uri', () => {
    const invalid = { ...valid, data: {} };
    expect(() => $TtlItemEvent.parse(invalid)).toThrow();
  });
});

describe('validateTtlItemEvent', () => {
  const valid = {
    profileversion: '1.0.0',
    profilepublished: '2025-10',
    id: '550e8400-e29b-41d4-a716-446655440002',
    specversion: '1.0',
    source: '/nhs/england/notify/production/primary/data-plane/digital-letters',
    subject:
      'customer/920fca11-596a-4eca-9c47-99f624614658/recipient/769acdd4-6a47-496f-999f-76a6fd2c3959',
    type: 'uk.nhs.notify.digital.letters.ttl.v1',
    time: '2024-07-10T14:30:00Z',
    recordedtime: '2024-07-10T14:30:00.250Z',
    severitynumber: 2,
    traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    datacontenttype: 'application/json',
    dataschema:
      'https://notify.nhs.uk/schemas/events/digital-letters/2025-10/digital-letters.schema.json',
    dataschemaversion: '1',
    severitytext: 'INFO',
    data: {
      'digital-letter-id': '123e4567-e89b-12d3-a456-426614174000',
      uri: 'https://example.com/ttl/resource',
    },
  };

  it('returns success for valid TTL item event', () => {
    const result = validateTtlItemEvent(valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(valid);
  });

  it('returns failure for invalid TTL item event', () => {
    const result = validateTtlItemEvent({});
    expect(result.success).toBe(false);
  });
});
