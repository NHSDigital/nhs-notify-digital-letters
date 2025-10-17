export type ProcessingStatistics = {
  processed: number;
  deleted: number;
  failedToDelete: number;
};

export type TtlRecord = {
  PK: string;
  SK: string;
  dateOfExpiry: string;
  ttl: number;
};

export type TtlRecordKey = Pick<TtlRecord, 'PK' | 'SK'>;

export function isTtlRecord(
  record: Record<string, unknown> | undefined,
): record is TtlRecord {
  return (
    typeof record?.PK === 'string' &&
    typeof record?.SK === 'string' &&
    typeof record?.dateOfExpiry === 'string' &&
    typeof record?.ttl === 'number'
  );
}
