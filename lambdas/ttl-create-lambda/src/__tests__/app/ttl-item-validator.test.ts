import { $TtlItem } from 'app/ttl-item-validator';

describe('$TtlItem', () => {
  const valid = {
    id: 'id',
    source: 'src',
    specversion: '1',
    type: 't',
    plane: 'p',
    subject: 's',
    time: '2024-07-10T14:30:00Z',
    datacontenttype: 'json',
    dataschema: 'sch',
    dataschemaversion: '1',
    data: { uri: 'uri' },
  };

  it('parses a valid object', () => {
    expect($TtlItem.parse(valid)).toEqual(valid);
  });

  it('fails for missing required fields', () => {
    expect(() => $TtlItem.parse({})).toThrow();
  });

  it('fails for invalid data types', () => {
    const invalid = { ...valid, id: 123, time: 'now' };
    expect(() => $TtlItem.parse(invalid)).toThrow();
  });

  it('fails for missing data.uri', () => {
    const invalid = { ...valid, data: {} };
    expect(() => $TtlItem.parse(invalid)).toThrow();
  });
});
