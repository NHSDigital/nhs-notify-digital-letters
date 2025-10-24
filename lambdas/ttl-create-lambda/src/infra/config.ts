import { defaultConfigReader } from 'utils';

export type TtlCreateConfig = {
  ttlTableName: string;
  ttlWaitTimeHours: number;
  ttlShardCount: number;
};

export function loadConfig(): TtlCreateConfig {
  return {
    ttlTableName: defaultConfigReader.getValue('TTL_TABLE_NAME'),
    ttlWaitTimeHours: defaultConfigReader.getInt('TTL_WAIT_TIME_HOURS'),
    ttlShardCount: defaultConfigReader.getInt('TTL_SHARD_COUNT'),
  };
}
