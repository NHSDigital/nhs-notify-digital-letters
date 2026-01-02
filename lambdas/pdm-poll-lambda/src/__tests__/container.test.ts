import { createContainer } from 'container';

jest.mock('infra/config', () => ({
  loadConfig: jest.fn(() => ({
    apimBaseUrl: 'https://test-apim-url',
    apimAccessTokenSsmParameterName: 'test-ssm-parameter-name',
    eventPublisherDlqUrl: 'test-url',
    eventPublisherEventBusArn: 'test-arn',
    maxPollCount: 10,
  })),
}));

jest.mock('utils', () => ({
  createGetApimAccessToken: jest.fn(() => ({})),
  eventBridgeClient: {},
  EventPublisher: jest.fn(() => ({})),
  logger: {},
  ParameterStoreCache: jest.fn(() => ({})),
  PdmClient: jest.fn(() => ({})),
  sqsClient: {},
}));

describe('container', () => {
  it('should create container', () => {
    const container = createContainer();
    expect(container).toBeDefined();
  });
});
