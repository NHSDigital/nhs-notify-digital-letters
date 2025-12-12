import { defaultConfigReader } from 'utils';

export type PdmCreateConfig = {
  apimBaseUrl: string;
  pollMaxRetries: number;
  apimAccessTokenSsmParameterName: string;
  eventPublisherEventBusArn: string;
  eventPublisherDlqUrl: string;
};

export function loadConfig(): PdmCreateConfig {
  return {
    apimBaseUrl: defaultConfigReader.getValue('APIM_BASE_URL'),
    pollMaxRetries: defaultConfigReader.getInt('POLL_MAX_RETRIES'),
    apimAccessTokenSsmParameterName: defaultConfigReader.getValue(
      'APIM_ACCESS_TOKEN_SSM_PARAMETER_NAME',
    ),
    eventPublisherEventBusArn: defaultConfigReader.getValue(
      'EVENT_PUBLISHER_EVENT_BUS_ARN',
    ),
    eventPublisherDlqUrl: defaultConfigReader.getValue(
      'EVENT_PUBLISHER_DLQ_URL',
    ),
  };
}
