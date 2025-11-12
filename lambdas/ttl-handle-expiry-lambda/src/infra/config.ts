import { defaultConfigReader } from 'utils';

export type SendRequestConfig = {
  eventPublisherEventBusArn: string;
  eventPublisherDlqUrl: string;
  dlqUrl: string;
};

export function loadConfig(): SendRequestConfig {
  return {
    eventPublisherEventBusArn: defaultConfigReader.getValue(
      'EVENT_PUBLISHER_EVENT_BUS_ARN',
    ),
    eventPublisherDlqUrl: defaultConfigReader.getValue(
      'EVENT_PUBLISHER_DLQ_URL',
    ),
    dlqUrl: defaultConfigReader.getValue('DLQ_URL'),
  };
}
