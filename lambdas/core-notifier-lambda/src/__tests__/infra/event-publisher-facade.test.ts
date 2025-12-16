import { mock } from 'jest-mock-extended';
import { EventPublisher, Logger } from 'utils';
import {
  MessageRequestRejected,
  MessageRequestSkipped,
  MessageRequestSubmitted,
} from 'digital-letters-events';
import { EventPublisherFacade } from 'infra/event-publisher-facade';
import messageRequestSubmittedValidator from 'digital-letters-events/MessageRequestSubmitted.js';
import messageRequestRejectedValidator from 'digital-letters-events/MessageRequestRejected.js';
import messageRequestSkippedValidator from 'digital-letters-events/MessageRequestSkipped.js';

jest.mock('digital-letters-events/MessageRequestSubmitted.js');
jest.mock('digital-letters-events/MessageRequestRejected.js');
jest.mock('digital-letters-events/MessageRequestSkipped.js');

describe('EventPublisherFacade', () => {
  const mockMessageRequestSubmittedEventPublisher = mock<EventPublisher>();
  const mockMessageRequestSkippedEventPublisher = mock<EventPublisher>();
  const mockMessageRequestRejectedEventPublisher = mock<EventPublisher>();
  const mockLogger = mock<Logger>();

  let eventPublisherFacade: EventPublisherFacade;

  beforeEach(() => {
    jest.clearAllMocks();

    eventPublisherFacade = new EventPublisherFacade(
      mockMessageRequestSubmittedEventPublisher,
      mockMessageRequestSkippedEventPublisher,
      mockMessageRequestRejectedEventPublisher,
      mockLogger,
    );
  });

  describe('publishMessageRequestSubmitted', () => {
    it('logs the event and publishes it using the submitted event publisher', async () => {
      const event: MessageRequestSubmitted = {
        id: 'event-id-123',
        source: 'urn:nhs:names:services:notify:core-notifier',
        specversion: '1.0',
        type: 'uk.nhs.notify.message-request.submitted',
        time: '2025-12-15T10:00:00Z',
        datacontenttype: 'application/json',
        data: {
          senderId: 'sender-123',
          messageReference: 'msg-ref-123',
          notifyMessageId: 'notify-id-123',
        },
      };

      await eventPublisherFacade.publishMessageRequestSubmitted(event);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Publishing MessageRequestSubmitted event for senderId=${event.data.senderId}, messageReference=${event.data.messageReference}`,
      );
      expect(
        mockMessageRequestSubmittedEventPublisher.sendEvents,
      ).toHaveBeenCalledWith([event], messageRequestSubmittedValidator);
    });
  });

  describe('publishMessageRequestRejected', () => {
    it('logs the event and publishes it using the rejected event publisher', async () => {
      const event: MessageRequestRejected = {
        id: 'event-id-456',
        source: 'urn:nhs:names:services:notify:core-notifier',
        specversion: '1.0',
        type: 'uk.nhs.notify.message-request.rejected',
        time: '2025-12-15T10:00:00Z',
        datacontenttype: 'application/json',
        data: {
          senderId: 'sender-456',
          messageReference: 'msg-ref-456',
          errorCode: 'VALIDATION_ERROR',
        },
      };

      await eventPublisherFacade.publishMessageRequestRejected(event);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Publishing MessageRequestRejected event for senderId=${event.data.senderId}, messageReference=${event.data.messageReference}`,
      );
      expect(
        mockMessageRequestRejectedEventPublisher.sendEvents,
      ).toHaveBeenCalledWith([event], messageRequestRejectedValidator);
    });
  });

  describe('publishMessageRequestSkipped', () => {
    it('logs the event and publishes it using the skipped event publisher', async () => {
      const event: MessageRequestSkipped = {
        id: 'event-id-789',
        source: 'urn:nhs:names:services:notify:core-notifier',
        specversion: '1.0',
        type: 'uk.nhs.notify.message-request.skipped',
        time: '2025-12-15T10:00:00Z',
        datacontenttype: 'application/json',
        data: {
          senderId: 'sender-789',
          messageReference: 'msg-ref-789',
          reason: 'No routing configuration',
        },
      };

      await eventPublisherFacade.publishMessageRequestSkipped(event);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Publishing MessageRequestSkipped event for senderId=${event.data.senderId}, messageReference=${event.data.messageReference}`,
      );
      expect(
        mockMessageRequestSkippedEventPublisher.sendEvents,
      ).toHaveBeenCalledWith([event], messageRequestSkippedValidator);
    });
  });
});
