import { createContainer } from 'container';

jest.mock('infra/config', () => ({
  loadConfig: jest.fn(() => ({
    eventPublisherDlqUrl: 'test-url',
    eventPublisherEventBusArn: 'test-arn',
  })),
}));

jest.mock('sender-management', () => ({
  SenderManagement: jest.fn(() => ({})),
}));

jest.mock('utils', () => ({
  EventPublisher: jest.fn(() => ({})),
  ParameterStoreCache: jest.fn(() => ({})),
  eventBridgeClient: {},
  logger: {},
  sqsClient: {},
}));

describe('container', () => {
  it('should create container', () => {
    const container = createContainer();
    expect(container).toBeDefined();
  });
});
