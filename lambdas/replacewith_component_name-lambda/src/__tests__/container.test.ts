import { mock } from 'jest-mock-extended';
import { EventPublisher, ParameterStoreCache, logger } from 'utils';
import { MessageProcessor } from 'app/message-processor';
import { ISenderManagement, SenderManagement } from 'sender-management';
import { createContainer } from 'container';
import { loadConfig } from 'infra/config';

jest.mock('utils', () => ({
  ParameterStoreCache: jest.fn(),
  createGetApimAccessToken: jest.fn(() => jest.fn()),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  EventPublisher: jest.fn(),
  eventBridgeClient: {},
  sqsClient: {},
}));

jest.mock('app/notify-api-client');
jest.mock('app/notify-message-processor');
jest.mock('infra/config');

describe('createContainer', () => {
  const mockParameterStore = mock<ParameterStoreCache>();
  const mockConfig = {
    eventPublisherEventBusArn:
      'arn:aws:events:eu-west-2:123456789012:event-bus/test-bus',
    eventPublisherDlqUrl:
      'https://sqs.eu-west-2.amazonaws.com/123456789012/test-dlq',
    environment: 'test',
  };

  const mockSenderManagement = mock<ISenderManagement>();
  const mockMessageProcessor = mock<MessageProcessor>();
  const mockEventPublisher = mock<EventPublisher>();

  beforeEach(() => {
    jest.clearAllMocks();

    (ParameterStoreCache as jest.Mock).mockImplementation(
      () => mockParameterStore,
    );
    (loadConfig as jest.Mock).mockReturnValue(mockConfig);
    (SenderManagement as jest.Mock).mockImplementation(
      () => mockSenderManagement,
    );
    (MessageProcessor as jest.Mock).mockImplementation(
      () => mockMessageProcessor,
    );
    (EventPublisher as jest.Mock).mockImplementation(() => mockEventPublisher);
  });

  it('creates and returns a container with all dependencies', async () => {
    const container = await createContainer();

    expect(container).toEqual({
      notifyMessageProcessor: mockMessageProcessor,
      logger,
      senderManagement: mockSenderManagement,
      eventPublisher: mockEventPublisher,
    });
  });

  it('loads configuration', async () => {
    await createContainer();

    expect(loadConfig).toHaveBeenCalledTimes(1);
  });


  it('creates NotifyMessageProcessor with client and logger', async () => {
    await createContainer();

    expect(MessageProcessor).toHaveBeenCalledTimes(1);
    expect(MessageProcessor).toHaveBeenCalledWith({
      logger,
    });
  });

  it('creates EventPublisher instances with config', async () => {
    await createContainer();

    expect(EventPublisher).toHaveBeenCalledTimes(1);
    expect(EventPublisher).toHaveBeenCalledWith(
      expect.objectContaining({
        eventBusArn: mockConfig.eventPublisherEventBusArn,
        dlqUrl: mockConfig.eventPublisherDlqUrl,
        logger,
        sqsClient: expect.any(Object),
        eventBridgeClient: expect.any(Object),
      }),
    );
  });
});
