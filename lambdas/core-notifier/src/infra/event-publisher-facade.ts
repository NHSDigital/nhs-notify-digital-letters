import { EventPublisher, Logger } from 'utils';
import {
  MessageRequestRejected,
  MessageRequestSkipped,
  MessageRequestSubmitted,
} from 'digital-letters-events';
import messageRequestSubmittedValidator from 'digital-letters-events/MessageRequestSubmitted.js';
import messageRequestRejectedValidator from 'digital-letters-events/MessageRequestRejected.js';
import messageRequestSkippedValidator from 'digital-letters-events/MessageRequestSkipped.js';

export class EventPublisherFacade {
  constructor(
    private readonly messageRequestSubmittedEventPublisher: EventPublisher,
    private readonly messageRequestSkippedEventPublisher: EventPublisher,
    private readonly messageRequestRejectedEventPublisher: EventPublisher,
    private readonly logger: Logger,
  ) {}

  async publishMessageRequestSubmitted(
    event: MessageRequestSubmitted,
  ): Promise<void> {
    this.logger.info(
      `Publishing MessageRequestSubmitted event for senderId=${event.data.senderId}, messageReference=${event.data.messageReference}`,
    );
    this.messageRequestSubmittedEventPublisher.sendEvents<MessageRequestSubmitted>(
      [event],
      messageRequestSubmittedValidator,
    );
  }

  async publishMessageRequestRejected(
    event: MessageRequestRejected,
  ): Promise<void> {
    this.logger.info(
      `Publishing MessageRequestRejected event for senderId=${event.data.senderId}, messageReference=${event.data.messageReference}`,
    );
    this.messageRequestRejectedEventPublisher.sendEvents<MessageRequestRejected>(
      [event],
      messageRequestRejectedValidator,
    );
  }

  async publishMessageRequestSkipped(
    event: MessageRequestSkipped,
  ): Promise<void> {
    this.logger.info(
      `Publishing MessageRequestSkipped event for senderId=${event.data.senderId}, messageReference=${event.data.messageReference}`,
    );
    this.messageRequestSkippedEventPublisher.sendEvents<MessageRequestSkipped>(
      [event],
      messageRequestSkippedValidator,
    );
  }
}
