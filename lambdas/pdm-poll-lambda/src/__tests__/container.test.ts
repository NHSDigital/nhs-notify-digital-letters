import { createContainer } from 'container';

jest.mock('infra/config', () => ({
  loadConfig: jest.fn(() => ({
    apimBaseUrl: 'https://test-apim-url',
    apimAccessTokenSsmParameterName: 'test-ssm-parameter-name',
    eventPublisherDlqUrl: 'test-url',
    eventPublisherEventBusArn: 'test-arn',
  })),
}));

jest.mock('utils', () => ({
  EventPublisher: jest.fn(() => ({})),
  eventBridgeClient: {},
  logger: {},
  sqsClient: {},
  ParameterStoreCache: jest.fn(() => ({})),
  createGetApimAccessToken: jest.fn(() => ({})),
}));

describe('container', () => {
  it('should create container', () => {
    const container = createContainer();
    expect(container).toBeDefined();
  });
});
