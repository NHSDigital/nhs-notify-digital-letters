import { createContainer } from 'container';

jest.mock('infra/config', () => ({
  loadConfig: jest.fn(() => ({
    eventPublisherDlqUrl: 'test-url',
    eventPublisherEventBusArn: 'test-arn',
    ttlShardCount: 1,
    ttlTableName: 'test-table',
    ttlWaitTimeHours: 24,
  })),
}));

jest.mock('infra/ttl-repository', () => ({
  TtlRepository: jest.fn(() => ({})),
}));

jest.mock('app/create-ttl', () => ({
  CreateTtl: jest.fn(() => ({})),
}));

jest.mock('utils', () => ({
  EventPublisher: jest.fn(() => ({})),
  dynamoClient: {},
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
