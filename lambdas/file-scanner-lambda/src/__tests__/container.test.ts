import { createContainer } from 'container';
import * as configModule from 'infra/config';

jest.mock('infra/config');

const mockLoadConfig = configModule.loadConfig as jest.MockedFunction<
  typeof configModule.loadConfig
>;

describe('createContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create container with all dependencies', () => {
    mockLoadConfig.mockReturnValue({
      documentReferenceBucket: 'test-doc-ref-bucket',
      unscannedFilesBucket: 'test-unscanned-bucket',
      unscannedFilesPathPrefix: 'dev',
      eventPublisherEventBusArn:
        'arn:aws:events:us-east-1:123456789012:event-bus/test',
      eventPublisherDlqUrl: 'https://sqs.us-east-1.amazonaws.com/dlq',
    });

    const container = createContainer();

    expect(container).toHaveProperty('eventPublisher');
    expect(container).toHaveProperty('logger');
    expect(container).toHaveProperty('fileScanner');
    expect(mockLoadConfig).toHaveBeenCalledTimes(1);
  });

  it('should call loadConfig to get configuration', () => {
    const mockConfig = {
      documentReferenceBucket: 'test-bucket',
      unscannedFilesBucket: 'test-unscanned',
      unscannedFilesPathPrefix: 'dev',
      eventPublisherEventBusArn: 'arn:test',
      eventPublisherDlqUrl: 'url:test',
    };

    mockLoadConfig.mockReturnValue(mockConfig);

    createContainer();

    expect(mockLoadConfig).toHaveBeenCalled();
  });

  it('should propagate config errors', () => {
    mockLoadConfig.mockImplementation(() => {
      throw new Error('Missing required config');
    });

    expect(() => createContainer()).toThrow('Missing required config');
  });
});
