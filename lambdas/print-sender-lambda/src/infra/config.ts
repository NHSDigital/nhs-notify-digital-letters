import { defaultConfigReader } from 'utils';

export type PrintSenderConfig = {
  eventPublisherEventBusArn: string;
  eventPublisherDlqUrl: string;
  environment: string;
  accountName: string;
};

export function loadConfig(): PrintSenderConfig {
  return {
    eventPublisherEventBusArn: defaultConfigReader.getValue(
      'EVENT_PUBLISHER_EVENT_BUS_ARN',
    ),
    eventPublisherDlqUrl: defaultConfigReader.getValue(
      'EVENT_PUBLISHER_DLQ_URL',
    ),
    environment: defaultConfigReader.getValue('ENVIRONMENT'),
    accountName: defaultConfigReader.getValue('ACCOUNT_NAME'),
  };
}
