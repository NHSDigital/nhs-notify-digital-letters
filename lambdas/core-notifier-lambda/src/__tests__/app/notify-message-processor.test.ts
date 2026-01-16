import { mock } from 'jest-mock-extended';
import { logger } from 'utils';
import { NotifyMessageProcessor } from 'app/notify-message-processor';
import { mockRequest1, mockResponse } from '__tests__/constants';
import { NotifyClient } from 'app/notify-api-client';
import { RequestAlreadyReceivedError } from 'domain/request-already-received-error';

jest.mock('utils');

const mockClient = mock<NotifyClient>();

const mockLogger = jest.mocked(logger);
const senderId = 'test-sender-id';

const notifyMessageProcessor = new NotifyMessageProcessor({
  nhsNotifyClient: mockClient,
  logger: mockLogger,
});

describe('NotifyMessageProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completes when the API client succeeds', async () => {
    mockClient.sendRequest.mockResolvedValueOnce(mockResponse);

    expect(
      await notifyMessageProcessor.process(mockRequest1, senderId),
    ).toEqual(mockResponse.data.id);

    expect(mockClient.sendRequest).toHaveBeenCalledTimes(1);
    expect(mockClient.sendRequest).toHaveBeenCalledWith(
      mockRequest1,
      mockRequest1.data.attributes.messageReference,
    );

    expect(mockLogger.info).toHaveBeenCalledWith({
      description: 'Sending request to Notify API',
      messageReference: mockRequest1.data.attributes.messageReference,
      senderId,
    });

    expect(mockLogger.info).toHaveBeenCalledWith({
      description: 'Successfully processed request and sent to Notify',
      messageReference: mockRequest1.data.attributes.messageReference,
      messageItemId: mockResponse.data.id,
      senderId,
    });
  });

  it('re-throws when the API client fails', async () => {
    const errorMessage = 'API failure';
    const err = new Error(errorMessage);
    mockClient.sendRequest.mockRejectedValue(err);

    await expect(
      notifyMessageProcessor.process(mockRequest1, senderId),
    ).rejects.toThrow(err);

    expect(mockLogger.error).toHaveBeenCalledWith({
      description: 'Failed sending request to Notify API',
      messageReference: mockRequest1.data.attributes.messageReference,
      senderId,
      error: errorMessage,
    });
  });

  it('re-throw when a RequestAlreadyReceivedError is thrown by the API client', async () => {
    const { messageReference } = mockRequest1.data.attributes;
    const err = new RequestAlreadyReceivedError(
      new Error('Request was already received!'),
      messageReference,
    );
    mockClient.sendRequest.mockRejectedValue(err);

    await expect(
      notifyMessageProcessor.process(mockRequest1, senderId),
    ).rejects.toThrow(err);

    expect(mockLogger.info).toHaveBeenCalledWith({
      description: 'Request has already been received by Notify',
      messageReference,
      senderId,
    });
  });
});
