import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { randomUUID } from 'node:crypto';
import { sqsClient } from '../sqs-utils';
import { CloudEvent } from '../types';
import { $CloudEvent } from '../validators';
import { Logger } from '../logger';

const MAX_BATCH_SIZE = 10;

export interface EventPublishConfig {
  eventBusArn: string;
  dlqUrl: string;
  logger: Logger;
}

export class EventPublisher {
  private readonly eventBridge: EventBridgeClient;

  private readonly config: EventPublishConfig;

  private readonly logger: Logger;

  constructor(config: EventPublishConfig) {
    if (!config.eventBusArn) {
      throw new Error('eventBusArn is required in config');
    }
    if (!config.dlqUrl) {
      throw new Error('dlqUrl is required in config');
    }
    if (!config.logger) {
      throw new Error('logger is required in config');
    }

    this.config = config;
    this.logger = config.logger;
    this.eventBridge = new EventBridgeClient({});
  }

  private async sendToEventBridge(events: CloudEvent[]): Promise<CloudEvent[]> {
    const failedEvents: CloudEvent[] = [];
    this.logger.info({
      description: `Sending ${events.length} events to EventBridge`,
      eventBusArn: this.config.eventBusArn,
      eventCount: events.length,
    });

    for (let i = 0; i < events.length; i += MAX_BATCH_SIZE) {
      const batch = events.slice(i, i + MAX_BATCH_SIZE);
      this.logger.info({
        description: `Sending batch of ${batch.length} events to EventBridge`,
        eventBusArn: this.config.eventBusArn,
        batchSize: batch.length,
      });

      try {
        const entries = batch.map((event) => ({
          Source: 'custom.event',
          DetailType: event.type,
          Detail: JSON.stringify(event),
          EventBusName: this.config.eventBusArn,
        }));

        const response = await this.eventBridge.send(
          new PutEventsCommand({ Entries: entries }),
        );

        this.logger.info({
          description: 'EventBridge batch sent',
          batchSize: batch.length,
          failedEntryCount: response.FailedEntryCount || 0,
          successfulCount: batch.length - (response.FailedEntryCount || 0),
        });

        if (response.FailedEntryCount && response.Entries) {
          for (const [idx, entry] of response.Entries.entries()) {
            if (entry.ErrorCode) {
              this.logger.warn({
                description: 'Event failed to send to EventBridge',
                errorCode: entry.ErrorCode,
                errorMessage: entry.ErrorMessage,
                eventId: batch[idx].id,
              });
              failedEvents.push(batch[idx]);
            }
          }
        }
      } catch (error) {
        this.logger.warn({
          description: 'EventBridge send error',
          err: error,
          batchSize: batch.length,
        });
        failedEvents.push(...batch);
      }
    }

    return failedEvents;
  }

  private async sendToDLQ(events: CloudEvent[]): Promise<CloudEvent[]> {
    const failedDlqs: CloudEvent[] = [];

    this.logger.warn({
      description: 'Sending failed events to DLQ',
      dlqUrl: this.config.dlqUrl,
      eventCount: events.length,
    });

    for (let i = 0; i < events.length; i += MAX_BATCH_SIZE) {
      const batch = events.slice(i, i + MAX_BATCH_SIZE);
      const idToEventMap = new Map<string, CloudEvent>();

      const entries = batch.map((event) => {
        const id = randomUUID();
        idToEventMap.set(id, event);
        return {
          Id: id,
          MessageBody: JSON.stringify(event),
        };
      });

      try {
        const response = await sqsClient.send(
          new SendMessageBatchCommand({
            QueueUrl: this.config.dlqUrl,
            Entries: entries,
          }),
        );

        if (response.Failed)
          for (const failedEntry of response.Failed) {
            const failedEvent =
              failedEntry.Id && idToEventMap.get(failedEntry.Id);
            if (failedEvent) {
              this.logger.warn({
                description: 'Event failed to send to DLQ',
                errorCode: failedEntry.Code,
                errorMessage: failedEntry.Message,
                eventId: failedEvent.id,
              });
              failedDlqs.push(failedEvent);
            }
          }
      } catch (error) {
        this.logger.warn({
          description: 'DLQ send error',
          err: error,
          dlqUrl: this.config.dlqUrl,
          batchSize: batch.length,
        });
        failedDlqs.push(...batch);
      }
    }

    if (failedDlqs.length > 0) {
      this.logger.error({
        description: 'Failed to send events to DLQ',
        failedEventCount: failedDlqs.length,
        dlqUrl: this.config.dlqUrl,
      });
    }

    return failedDlqs;
  }

  public async sendEvents(events: CloudEvent[]): Promise<CloudEvent[]> {
    if (events.length === 0) {
      this.logger.info({ description: 'No events to send' });
      return [];
    }

    const validEvents: CloudEvent[] = [];
    const invalidEvents: CloudEvent[] = [];

    for (const event of events) {
      if ($CloudEvent.safeParse(event).success) {
        validEvents.push(event);
      } else {
        invalidEvents.push(event);
      }
    }

    this.logger.info({
      description: 'Event validation completed',
      validEventCount: validEvents.length,
      invalidEventCount: invalidEvents.length,
      totalEventCount: events.length,
    });

    const totalFailedEvents: CloudEvent[] = [];

    if (invalidEvents.length > 0) {
      const failedDlqSends = await this.sendToDLQ(invalidEvents);
      totalFailedEvents.push(...failedDlqSends);
    }

    if (validEvents.length > 0) {
      const failedSends = await this.sendToEventBridge(validEvents);
      if (failedSends.length > 0) {
        const failedDlqSends = await this.sendToDLQ(failedSends);
        totalFailedEvents.push(...failedDlqSends);
      }
    }

    return totalFailedEvents;
  }
}
