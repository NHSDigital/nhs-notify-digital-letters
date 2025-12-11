import { EventPublisher, Logger } from 'utils';
import { MessageRequestSubmitted, MessageRequestRejected, MessageRequestSkipped } from 'digital-letters-events';
import messageRequestSubmittedValidator from 'digital-letters-events/MessageRequestSubmitted.js';
import messageRequestRejectedValidator from 'digital-letters-events/MessageRequestRejected.js';
import messageRequestSkippedValidator from 'digital-letters-events/MessageRequestSkipped.js';
export class EventPublisherFacade {
    constructor(private readonly messageRequestSubmittedEventPublisher: EventPublisher,
        private readonly messageRequestSkippedEventPublisher: EventPublisher,
        private readonly messageRequestRejectedEventPublisher: EventPublisher,
        private readonly logger: Logger
    ){}

    async publishMessageRequestSubmitted(events: [MessageRequestSubmitted]): Promise<void>{
        this.logger.info(`Publishing ${events.length} MessageRequestSubmitted events`);
        this.messageRequestSubmittedEventPublisher.sendEvents<MessageRequestSubmitted>(
            events, messageRequestSubmittedValidator);
    }

    async publishMessageRequestRejected(events: [MessageRequestRejected]): Promise<void>{
        this.logger.info(`Publishing ${events.length} MessageRequestRejected events`);
        this.messageRequestRejectedEventPublisher.sendEvents<MessageRequestRejected>(
            events, messageRequestRejectedValidator);
    }

    async publishMessageRequestSkipped(events: [MessageRequestSkipped]): Promise<void>{
        this.logger.info(`Publishing ${events.length} MessageRequestSkipped events`);
        this.messageRequestSkippedEventPublisher.sendEvents<MessageRequestSkipped>(
            events, messageRequestSkippedValidator);
    }
}
