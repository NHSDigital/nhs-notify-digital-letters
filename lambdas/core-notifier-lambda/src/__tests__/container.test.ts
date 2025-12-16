import { mock } from 'jest-mock-extended';
import { ParameterStoreCache, logger } from 'utils';
import { NotifyClient } from 'app/notify-api-client';
import { NotifyMessageProcessor } from 'app/notify-message-processor';
import { SenderManagement } from 'sender-management';
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
}));

jest.mock('app/notify-api-client');
jest.mock('app/notify-message-processor');
jest.mock('sender-management');
jest.mock('infra/config');

describe('createContainer', () => {
  const mockParameterStore = mock<ParameterStoreCache>();
  const mockConfig = {
    eventPublisherEventBusArn:
      'arn:aws:events:eu-west-2:123456789012:event-bus/test-bus',
    eventPublisherDlqUrl:
      'https://sqs.eu-west-2.amazonaws.com/123456789012/test-dlq',
    apimAccessTokenSsmParameterName: '/test/apim/access-token',
    apimBaseUrl: 'https://api.test.nhs.uk',
    environment: 'test',
  };

  const mockSenderManagement = mock<SenderManagement>();
  const mockNotifyClient = mock<NotifyClient>();
  const mockNotifyMessageProcessor = mock<NotifyMessageProcessor>();

  beforeEach(() => {
    jest.clearAllMocks();

    (ParameterStoreCache as jest.Mock).mockImplementation(
      () => mockParameterStore,
    );
    (loadConfig as jest.Mock).mockReturnValue(mockConfig);
    (SenderManagement as jest.Mock).mockImplementation(
      () => mockSenderManagement,
    );
    (NotifyClient as jest.Mock).mockImplementation(() => mockNotifyClient);
    (NotifyMessageProcessor as jest.Mock).mockImplementation(
      () => mockNotifyMessageProcessor,
    );
  });

  it('creates and returns a container with all dependencies', async () => {
    const container = await createContainer();

    expect(container).toEqual({
      notifyMessageProcessor: mockNotifyMessageProcessor,
      logger,
      senderManagement: mockSenderManagement,
    });
  });

  it('initializes ParameterStoreCache', async () => {
    await createContainer();

    expect(ParameterStoreCache).toHaveBeenCalledTimes(1);
    expect(ParameterStoreCache).toHaveBeenCalledWith();
  });

  it('loads configuration', async () => {
    await createContainer();

    expect(loadConfig).toHaveBeenCalledTimes(1);
  });

  it('creates SenderManagement with parameter store', async () => {
    await createContainer();

    expect(SenderManagement).toHaveBeenCalledTimes(1);
    expect(SenderManagement).toHaveBeenCalledWith({
      parameterStore: mockParameterStore,
    });
  });

  it('creates NotifyClient with config and dependencies', async () => {
    await createContainer();

    expect(NotifyClient).toHaveBeenCalledTimes(1);
    expect(NotifyClient).toHaveBeenCalledWith(
      mockConfig.apimBaseUrl,
      expect.objectContaining({
        getAccessToken: expect.any(Function),
      }),
      logger,
    );
  });

  it('creates NotifyMessageProcessor with client and logger', async () => {
    await createContainer();

    expect(NotifyMessageProcessor).toHaveBeenCalledTimes(1);
    expect(NotifyMessageProcessor).toHaveBeenCalledWith({
      nhsNotifyClient: mockNotifyClient,
      logger,
    });
  });

  it('creates all dependencies in the correct order', async () => {
    const callOrder: string[] = [];

    (ParameterStoreCache as jest.Mock).mockImplementation(() => {
      callOrder.push('ParameterStoreCache');
      return mockParameterStore;
    });

    (loadConfig as jest.Mock).mockImplementation(() => {
      callOrder.push('loadConfig');
      return mockConfig;
    });

    (SenderManagement as jest.Mock).mockImplementation(() => {
      callOrder.push('SenderManagement');
      return mockSenderManagement;
    });

    (NotifyClient as jest.Mock).mockImplementation(() => {
      callOrder.push('NotifyClient');
      return mockNotifyClient;
    });

    (NotifyMessageProcessor as jest.Mock).mockImplementation(() => {
      callOrder.push('NotifyMessageProcessor');
      return mockNotifyMessageProcessor;
    });

    await createContainer();

    expect(callOrder).toEqual([
      'ParameterStoreCache',
      'loadConfig',
      'SenderManagement',
      'NotifyClient',
      'NotifyMessageProcessor',
    ]);
  });
});
