import { defaultConfigReader } from 'utils';

export type NotifySendMessageConfig = {
  eventPublisherEventBusArn: string;
  eventPublisherDlqUrl: string;
  environment: string;
};

export function loadConfig(): NotifySendMessageConfig {
  return {
    eventPublisherEventBusArn: defaultConfigReader.getValue(
      'EVENT_PUBLISHER_EVENT_BUS_ARN',
    ),
    eventPublisherDlqUrl: defaultConfigReader.getValue(
      'EVENT_PUBLISHER_DLQ_URL',
    ),
    environment: defaultConfigReader.getValue('ENVIRONMENT'),
  };
}
