import { createContainer } from 'container';

jest.mock('infra/config', () => ({
  loadConfig: jest.fn(() => ({
    eventPublisherDlqUrl: 'test-url',
    eventPublisherEventBusArn: 'test-arn',
  })),
}));

jest.mock('utils', () => ({
  eventBridgeClient: {},
  EventPublisher: jest.fn(() => ({})),
  logger: {},
  sqsClient: {},
}));

describe('container', () => {
  it('should create container', () => {
    const container = createContainer();
    expect(container).toBeDefined();
  });
});
