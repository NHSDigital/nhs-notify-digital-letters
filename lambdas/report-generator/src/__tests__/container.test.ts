import { createContainer } from 'container';

jest.mock('infra/config', () => ({
  loadConfig: jest.fn(() => ({
    athenaDatabase: 'test-database',
    athenaWorkgroup: 'test-workgroup',
    eventPublisherDlqUrl: 'test-url',
    eventPublisherEventBusArn: 'test-arn',
    maxPollLimit: 10,
    reportName: 'test-report',
    reportingBucket: 'test-bucket',
    waitForInSeconds: 5,
  })),
}));

jest.mock('utils', () => ({
  ...jest.requireActual('utils'),
  AthenaRepository: jest.fn(() => ({})),
  ReportService: jest.fn(() => ({})),
  createStorageRepository: jest.fn(() => ({})),
  s3Client: {},
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
