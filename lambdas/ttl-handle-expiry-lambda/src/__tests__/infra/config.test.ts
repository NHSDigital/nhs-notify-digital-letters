import { defaultConfigReader } from 'utils';
import { loadConfig } from 'infra/config';

jest.mock('utils', () => ({
  defaultConfigReader: {
    getValue: jest.fn(),
  },
}));

const mockGetValue = defaultConfigReader.getValue as jest.MockedFunction<
  typeof defaultConfigReader.getValue
>;

describe('loadConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load configuration from environment variables', () => {
    const mockEventBusArn =
      'arn:aws:events:us-east-1:123456789012:event-bus/test-bus';
    const mockEventPublisherDlqUrl =
      'https://sqs.us-east-1.amazonaws.com/123456789012/publisher-dlq';
    const mockDlqUrl =
      'https://sqs.us-east-1.amazonaws.com/123456789012/test-dlq';

    mockGetValue
      .mockReturnValueOnce(mockEventBusArn)
      .mockReturnValueOnce(mockEventPublisherDlqUrl)
      .mockReturnValueOnce(mockDlqUrl);

    const config = loadConfig();

    expect(defaultConfigReader.getValue).toHaveBeenCalledTimes(3);
    expect(defaultConfigReader.getValue).toHaveBeenCalledWith(
      'EVENT_PUBLISHER_EVENT_BUS_ARN',
    );
    expect(defaultConfigReader.getValue).toHaveBeenCalledWith(
      'EVENT_PUBLISHER_DLQ_URL',
    );
    expect(defaultConfigReader.getValue).toHaveBeenCalledWith('DLQ_URL');

    expect(config).toEqual({
      eventPublisherEventBusArn: mockEventBusArn,
      eventPublisherDlqUrl: mockEventPublisherDlqUrl,
      dlqUrl: mockDlqUrl,
    });
  });

  it('should return config with correct structure', () => {
    mockGetValue
      .mockReturnValueOnce('test-bus-arn')
      .mockReturnValueOnce('test-publisher-dlq-url')
      .mockReturnValueOnce('test-dlq-url');

    const config = loadConfig();

    expect(config).toHaveProperty('eventPublisherEventBusArn');
    expect(config).toHaveProperty('eventPublisherDlqUrl');
    expect(config).toHaveProperty('dlqUrl');
    expect(typeof config.eventPublisherEventBusArn).toBe('string');
    expect(typeof config.eventPublisherDlqUrl).toBe('string');
    expect(typeof config.dlqUrl).toBe('string');
  });
});
