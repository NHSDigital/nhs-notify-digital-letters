import {
  EventBridgeClient,
  EventBridgeClientConfig,
} from '@aws-sdk/client-eventbridge';
import {
  eventBridgeClient,
  getEventBridgeClient,
} from '../../event-bridge-utils/event-bridge-client';

jest.mock('@aws-sdk/client-eventbridge');

const MockedEventBridgeClient = jest.mocked(EventBridgeClient);

describe('event-bridge-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEventBridgeClient', () => {
    it('should create an EventBridgeClient with default configuration', () => {
      getEventBridgeClient();

      expect(MockedEventBridgeClient).toHaveBeenCalledWith({});
    });

    it('should create an EventBridgeClient with additional options', () => {
      const additionalOptions: Partial<EventBridgeClientConfig> = {
        region: 'eu-west-2',
        maxAttempts: 3,
      };

      getEventBridgeClient(additionalOptions);

      expect(MockedEventBridgeClient).toHaveBeenCalledWith(additionalOptions);
    });

    it('should create an EventBridgeClient with empty additional options', () => {
      getEventBridgeClient({});

      expect(MockedEventBridgeClient).toHaveBeenCalledWith({});
    });

    it('should return an EventBridgeClient instance', () => {
      const client = getEventBridgeClient();

      expect(client).toBeInstanceOf(EventBridgeClient);
    });

    it('should create a new instance each time it is called', () => {
      const client1 = getEventBridgeClient();
      const client2 = getEventBridgeClient();

      expect(MockedEventBridgeClient).toHaveBeenCalledTimes(2);
      expect(client1).not.toBe(client2);
    });
  });

  describe('eventBridgeClient', () => {
    it('should be an instance of EventBridgeClient', () => {
      expect(eventBridgeClient).toBeInstanceOf(EventBridgeClient);
    });
  });
});
