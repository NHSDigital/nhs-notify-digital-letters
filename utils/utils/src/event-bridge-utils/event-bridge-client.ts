import {
  EventBridgeClient,
  EventBridgeClientConfig,
} from '@aws-sdk/client-eventbridge';

export function getEventBridgeClient(
  additionalOptions: Partial<EventBridgeClientConfig> = {},
) {
  return new EventBridgeClient({
    ...additionalOptions,
  });
}

export const eventBridgeClient = getEventBridgeClient();
