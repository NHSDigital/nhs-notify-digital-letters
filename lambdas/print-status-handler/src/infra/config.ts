import { defaultConfigReader } from 'utils';

export type Config = {
  eventPublisherEventBusArn: string;
  eventPublisherDlqUrl: string;
};

export function loadConfig(): Config {
  return {
    eventPublisherEventBusArn: defaultConfigReader.getValue(
      'EVENT_PUBLISHER_EVENT_BUS_ARN',
    ),
    eventPublisherDlqUrl: defaultConfigReader.getValue(
      'EVENT_PUBLISHER_DLQ_URL',
    ),
  };
}
