import { defaultConfigReader } from 'nhs-notify-digital-letters-utils';

export type SendRequestConfig = {
  ttlTableName: string;
  concurrency: number;
  maxProcessSeconds: number;
  writeShards: number;
};

export function loadConfig(): SendRequestConfig {
  return {
    ttlTableName: defaultConfigReader.getValue('TTL_TABLE_NAME'),
    concurrency: defaultConfigReader.getInt('CONCURRENCY'),
    maxProcessSeconds: defaultConfigReader.getInt('MAX_PROCESS_SECONDS'),
    writeShards: defaultConfigReader.getInt('WRITE_SHARDS'),
  };
}
