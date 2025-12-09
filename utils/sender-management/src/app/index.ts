import { createDeleteSenderCommand } from './delete-sender';
import { createGetSenderCommand } from './get-sender';
import { createListSendersCommand } from './list-senders';
import { createPutSenderCommand } from './put-sender';
import { AppDependencies } from './types';

export function createApp(dependencies: AppDependencies) {
  return {
    deleteSender: createDeleteSenderCommand(dependencies),
    getSender: createGetSenderCommand(dependencies),
    listSenders: createListSendersCommand(dependencies),
    putSender: createPutSenderCommand(dependencies),
  };
}

export type App = ReturnType<typeof createApp>;
export * from './types';
