import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { randomUUID } from 'node:crypto';
import { sqsClient } from 'sqs-utils';
import { CloudEvent } from 'types';
import { $CloudEvent } from 'validators';

const MAX_BATCH_SIZE = 10;

export interface EventPublishConfig {
  eventBusArn: string;
  dlqUrl: string;
}

const eventBridge = new EventBridgeClient({});

function validateEvent(event: CloudEvent) {
  return $CloudEvent.safeParse(event).success;
}

async function sendToEventBridge(
  events: CloudEvent[],
  eventBusArn: string,
): Promise<CloudEvent[]> {
  const failedEvents: CloudEvent[] = [];
  console.info(
    `Sending ${events.length} events to EventBridge: ${eventBusArn}`,
  );

  for (let i = 0; i < events.length; i += MAX_BATCH_SIZE) {
    const batch = events.slice(i, i + MAX_BATCH_SIZE);
    console.info(
      `Sending batch of ${batch.length} events to EventBridge: ${eventBusArn}`,
    );
    const entries = batch.map((event) => ({
      Source: 'custom.event',
      DetailType: event.type,
      Detail: JSON.stringify(event),
      EventBusName: eventBusArn,
    }));

    try {
      const response = await eventBridge.send(
        new PutEventsCommand({ Entries: entries }),
      );

      if (response.FailedEntryCount && response.Entries) {
        for (const [idx, entry] of response.Entries.entries()) {
          if (entry.ErrorCode) {
            console.warn(
              `Event failed with error: ${entry.ErrorCode} - ${entry.ErrorMessage}`,
            );
            failedEvents.push(batch[idx]);
          }
        }
      }
    } catch (error) {
      console.warn(`EventBridge send error: ${error}`);
      failedEvents.push(...batch);
    }
  }

  return failedEvents;
}

async function sendToDLQ(
  events: CloudEvent[],
  dlqUrl: string,
): Promise<CloudEvent[]> {
  const failedDlqs: CloudEvent[] = [];

  console.warn(`Sending ${events.length} failed events to DLQ`);

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
          QueueUrl: dlqUrl,
          Entries: entries,
        }),
      );

      if (response.Failed)
        for (const failedEntry of response.Failed) {
          const failedEvent =
            failedEntry.Id && idToEventMap.get(failedEntry.Id);
          if (failedEvent) {
            console.warn(
              `Event failed with error: ${failedEntry.Code} - ${failedEntry.Message}`,
            );
            failedDlqs.push(failedEvent);
          }
        }
    } catch (error) {
      console.warn(`DLQ send error: ${error}`);
      failedDlqs.push(...batch);
    }
  }

  if (failedDlqs.length > 0) {
    console.error(`Failed to send ${failedDlqs.length} events to DLQ`);
  }

  return failedDlqs;
}

export async function sendEvents(
  events: CloudEvent[],
  config: EventPublishConfig,
): Promise<CloudEvent[]> {
  if (events.length === 0) {
    console.info('No events to send.');
    return [];
  }

  if (!config.eventBusArn) {
    throw new Error('eventBusArn is required in config');
  }
  if (!config.dlqUrl) {
    throw new Error('dlqUrl is required in config');
  }

  const validEvents: CloudEvent[] = [];
  const invalidEvents: CloudEvent[] = [];

  for (const event of events) {
    if (validateEvent(event)) {
      validEvents.push(event);
    } else {
      invalidEvents.push(event);
    }
  }

  console.info(
    `Valid events: ${validEvents.length}, Invalid events: ${invalidEvents.length}`,
  );

  const totalFailedEvents: CloudEvent[] = [];

  if (invalidEvents.length > 0) {
    const failedDlqSends = await sendToDLQ(invalidEvents, config.dlqUrl);
    totalFailedEvents.push(...failedDlqSends);
  }

  if (validEvents.length > 0) {
    const failedSends = await sendToEventBridge(
      validEvents,
      config.eventBusArn,
    );
    if (failedSends.length > 0) {
      const failedDlqSends = await sendToDLQ(failedSends, config.dlqUrl);
      totalFailedEvents.push(...failedDlqSends);
    }
  }

  return totalFailedEvents;
}

export default sendEvents;
