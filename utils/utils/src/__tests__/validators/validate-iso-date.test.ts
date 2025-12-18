import { validateIsoDate } from '../../validators/validate-iso-date';

describe('validateIsoDate', () => {
  it.each(['2022-02-31', '2022-01-01'])(
    'returns true when provided valid iso date: %s',
    (date) => {
      const res = validateIsoDate(date);

      expect(res).toEqual(true);
    },
  );

  it.each(['foobar', 222_222, '02-02-2022', '2022-13-01', '2022-01-32'])(
    'returns false when provided invalid iso date: %s',
    (date) => {
      const res = validateIsoDate(date);

      expect(res).toEqual(false);
    },
  );
});
