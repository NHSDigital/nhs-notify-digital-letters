import { createContainer } from 'container';

jest.mock('infra/config', () => ({
  loadConfig: jest.fn(() => ({
    eventPublisherDlqUrl: 'test-url',
    eventPublisherEventBusArn: 'test-arn',
    ttlShardCount: 1,
    ttlTableName: 'test-table',
    environment: 'test-environment',
  })),
}));

jest.mock('infra/ttl-repository', () => ({
  TtlRepository: jest.fn(() => ({})),
}));

jest.mock('app/create-ttl', () => ({
  CreateTtl: jest.fn(() => ({})),
}));

jest.mock('sender-management/src/infra/sender-repository/repository', () => ({
  SenderRepository: jest.fn(() => ({})),
}));

jest.mock('utils', () => ({
  EventPublisher: jest.fn(() => ({})),
  dynamoClient: {},
  eventBridgeClient: {},
  logger: {},
  sqsClient: {},
  ParameterStoreCache: jest.fn(() => ({})),
}));

describe('container', () => {
  it('should create container', () => {
    const container = createContainer();
    expect(container).toBeDefined();
  });
});
