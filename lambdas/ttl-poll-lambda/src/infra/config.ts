import { defaultConfigReader } from 'utils';

export type SendRequestConfig = {
  ttlTableName: string;
  concurrency: number;
  maxProcessSeconds: number;
  ttlShardCount: number;
};

export function loadConfig(): SendRequestConfig {
  return {
    ttlTableName: defaultConfigReader.getValue('TTL_TABLE_NAME'),
    concurrency: defaultConfigReader.getInt('CONCURRENCY'),
    maxProcessSeconds: defaultConfigReader.getInt('MAX_PROCESS_SECONDS'),
    ttlShardCount: defaultConfigReader.getInt('TTL_SHARD_COUNT'),
  };
}
