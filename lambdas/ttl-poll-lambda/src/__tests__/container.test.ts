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

jest.mock('infra/dynamo-repository', () => ({
  DynamoRepository: jest.fn(() => ({})),
}));

jest.mock('infra/ttl-expiry-service', () => ({
  TtlExpiryService: jest.fn(() => ({})),
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
