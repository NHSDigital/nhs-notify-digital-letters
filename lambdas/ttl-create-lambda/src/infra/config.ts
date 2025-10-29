import { defaultConfigReader } from 'utils';

export type TtlCreateConfig = {
  ttlTableName: string;
  ttlWaitTimeHours: number;
  ttlShardCount: number;
  eventPublishBusArn: string;
  eventPublishDlqUrl: string;
};

export function loadConfig(): TtlCreateConfig {
  return {
    ttlTableName: defaultConfigReader.getValue('TTL_TABLE_NAME'),
    ttlWaitTimeHours: defaultConfigReader.getInt('TTL_WAIT_TIME_HOURS'),
    ttlShardCount: defaultConfigReader.getInt('TTL_SHARD_COUNT'),
    eventPublishBusArn: defaultConfigReader.getValue('EVENT_PUBLISH_BUS_ARN'),
    eventPublishDlqUrl: defaultConfigReader.getValue('EVENT_PUBLISH_DLQ_URL'),
  };
}
